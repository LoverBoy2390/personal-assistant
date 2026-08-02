#!/usr/bin/env python3
"""Validate the deployment-blocked AEGIS Gate 2B AWS foundation."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "infra" / "aws" / "gate2b" / "foundation.json"

PROHIBITED_RESOURCE_TYPES = {
    "AWS::IAM::AccessKey",
    "AWS::Cognito::UserPoolUser",
    "AWS::CodePipeline::Pipeline",
    "AWS::CodeBuild::Project",
}

SECRET_PATTERNS = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bASIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"(?i)\b(client_secret|api_key|access_token|refresh_token|password)\b\s*[:=]\s*[\"'][^\"']{8,}[\"']"),
]


def load_template(path: Path = TEMPLATE_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _resource(template: dict[str, Any], logical_id: str) -> dict[str, Any]:
    return template.get("Resources", {}).get(logical_id, {})


def validate_template(template: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    resources = template.get("Resources")
    if not isinstance(resources, dict) or not resources:
        return ["template must contain resources"]

    metadata = template.get("Metadata", {}).get("AEGIS", {})
    if metadata.get("Status") != "REVIEW_ONLY":
        errors.append("template metadata must remain REVIEW_ONLY")
    for field in ("PersonalDataAuthorized", "ProviderConnectionsAuthorized", "DeploymentAuthorized"):
        if metadata.get(field) is not False:
            errors.append(f"template metadata {field} must be false")

    approval = template.get("Parameters", {}).get("DeploymentApproval", {})
    if approval.get("Default") != "NOT_APPROVED":
        errors.append("DeploymentApproval must default to NOT_APPROVED")
    if approval.get("AllowedValues") != ["NOT_APPROVED", "APPROVE_GATE2B_DEPLOYMENT"]:
        errors.append("DeploymentApproval allowed values changed")
    condition = template.get("Conditions", {}).get("DeploymentApproved")
    expected = {"Fn::Equals": [{"Ref": "DeploymentApproval"}, "APPROVE_GATE2B_DEPLOYMENT"]}
    if condition != expected:
        errors.append("DeploymentApproved condition must require the exact explicit token")

    for logical_id, resource in resources.items():
        if resource.get("Condition") != "DeploymentApproved":
            errors.append(f"{logical_id} is not protected by DeploymentApproved")
        if resource.get("Type") in PROHIBITED_RESOURCE_TYPES:
            errors.append(f"prohibited deployable resource type: {resource.get('Type')}")

    serialized = json.dumps(template, sort_keys=True)
    for pattern in SECRET_PATTERNS:
        if pattern.search(serialized):
            errors.append(f"possible committed secret matched {pattern.pattern}")

    key_ids = ["DataKmsKey", "TokenKmsKey", "SecretsKmsKey", "LogKmsKey"]
    for logical_id in key_ids:
        key = _resource(template, logical_id)
        props = key.get("Properties", {})
        if key.get("Type") != "AWS::KMS::Key":
            errors.append(f"{logical_id} must be an AWS::KMS::Key")
            continue
        if props.get("EnableKeyRotation") is not True:
            errors.append(f"{logical_id} must enable rotation")
        if props.get("MultiRegion") is not False:
            errors.append(f"{logical_id} must remain region-isolated")
        if props.get("PendingWindowInDays") != 30:
            errors.append(f"{logical_id} must use a 30-day deletion window")
        if key.get("DeletionPolicy") != "Retain" or key.get("UpdateReplacePolicy") != "Retain":
            errors.append(f"{logical_id} must be retained on stack deletion or replacement")
    if len({json.dumps(_resource(template, key)["Properties"]["Description"]) for key in key_ids}) != 4:
        errors.append("KMS purposes must remain distinct")

    user_pool = _resource(template, "UserPool")
    up = user_pool.get("Properties", {})
    factors = up.get("Policies", {}).get("SignInPolicy", {}).get("AllowedFirstAuthFactors", [])
    if up.get("UserPoolTier") not in {"ESSENTIALS", "PLUS"}:
        errors.append("Cognito passkeys require Essentials or Plus")
    if up.get("DeletionProtection") != "ACTIVE":
        errors.append("Cognito deletion protection must be ACTIVE")
    if "WEB_AUTHN" not in factors:
        errors.append("Cognito must allow WEB_AUTHN")
    if up.get("WebAuthnUserVerification") != "required":
        errors.append("passkeys must require user verification")
    if up.get("AdminCreateUserConfig", {}).get("AllowAdminCreateUserOnly") is not True:
        errors.append("self-service account creation must remain disabled")
    if up.get("UsernameConfiguration", {}).get("CaseSensitive") is not False:
        errors.append("email usernames must be case-insensitive")

    client = _resource(template, "UserPoolClient").get("Properties", {})
    if client.get("GenerateSecret") is not False:
        errors.append("public client must not generate a client secret")
    if client.get("AllowedOAuthFlows") != ["code"]:
        errors.append("only OAuth authorization-code flow is allowed")
    if client.get("AllowedOAuthFlowsUserPoolClient") is not True:
        errors.append("OAuth flow support must be explicit")
    if client.get("PreventUserExistenceErrors") != "ENABLED":
        errors.append("user-existence errors must be suppressed")
    if client.get("EnableTokenRevocation") is not True:
        errors.append("token revocation must be enabled")
    rotation = client.get("RefreshTokenRotation", {})
    if rotation.get("Feature") != "ENABLED" or rotation.get("RetryGracePeriodSeconds") != 0:
        errors.append("refresh-token rotation must be enabled with zero grace")
    if client.get("AccessTokenValidity", 999) > 5:
        errors.append("access token validity may not exceed five minutes")
    if client.get("IdTokenValidity", 999) > 5:
        errors.append("ID token validity may not exceed five minutes")
    if client.get("ExplicitAuthFlows") != ["ALLOW_USER_AUTH"]:
        errors.append("native client auth must remain limited to ALLOW_USER_AUTH")

    api = _resource(template, "ProtectedApi").get("Properties", {})
    if api.get("ProtocolType") != "HTTP":
        errors.append("protected API must be an HTTP API")
    if api.get("DisableExecuteApiEndpoint") is not True:
        errors.append("default API Gateway endpoint must remain disabled")
    authorizer = _resource(template, "ProtectedApiJwtAuthorizer").get("Properties", {})
    if authorizer.get("AuthorizerType") != "JWT":
        errors.append("API must use a JWT authorizer")
    jwt = authorizer.get("JwtConfiguration", {})
    if not jwt.get("Audience") or not jwt.get("Issuer"):
        errors.append("JWT authorizer must pin audience and issuer")

    for subnet_id in ("PrivateSubnetA", "PrivateSubnetB", "PrivateSubnetC"):
        subnet = _resource(template, subnet_id).get("Properties", {})
        if subnet.get("MapPublicIpOnLaunch") is not False:
            errors.append(f"{subnet_id} must not assign public IP addresses")
    for logical_id, resource in resources.items():
        if resource.get("Type") == "AWS::EC2::Route":
            destination = resource.get("Properties", {}).get("DestinationCidrBlock")
            if destination == "0.0.0.0/0":
                errors.append(f"{logical_id} creates prohibited default internet route")
        if resource.get("Type") == "AWS::EC2::SecurityGroup":
            for rule in resource.get("Properties", {}).get("SecurityGroupIngress", []) or []:
                if rule.get("CidrIp") == "0.0.0.0/0" or rule.get("CidrIpv6") == "::/0":
                    errors.append(f"{logical_id} contains public ingress")
            for rule in resource.get("Properties", {}).get("SecurityGroupEgress", []) or []:
                if rule.get("CidrIp") == "0.0.0.0/0" or rule.get("CidrIpv6") == "::/0":
                    errors.append(f"{logical_id} contains unrestricted egress")

    db = _resource(template, "DatabaseCluster")
    dbp = db.get("Properties", {})
    if dbp.get("StorageEncrypted") is not True:
        errors.append("Aurora storage encryption must be enabled")
    if dbp.get("DeletionProtection") is not True:
        errors.append("Aurora deletion protection must be enabled")
    if dbp.get("EnableIAMDatabaseAuthentication") is not True:
        errors.append("Aurora IAM database authentication must be enabled")
    if dbp.get("ManageMasterUserPassword") is not True:
        errors.append("Aurora must use a managed master password")
    if "MasterUserPassword" in dbp:
        errors.append("Aurora template must not contain a master password")
    if dbp.get("BackupRetentionPeriod", 0) < 35:
        errors.append("Aurora backup retention must be at least 35 days")
    if db.get("DeletionPolicy") != "Snapshot" or db.get("UpdateReplacePolicy") != "Snapshot":
        errors.append("Aurora cluster must snapshot on deletion and replacement")
    for logical_id in ("DatabaseInstance1", "DatabaseInstance2"):
        instance = _resource(template, logical_id).get("Properties", {})
        if instance.get("PubliclyAccessible") is not False:
            errors.append(f"{logical_id} must not be publicly accessible")

    token_table = _resource(template, "TokenVaultTable")
    ttp = token_table.get("Properties", {})
    if ttp.get("DeletionProtectionEnabled") is not True:
        errors.append("token vault deletion protection must be enabled")
    if ttp.get("PointInTimeRecoverySpecification", {}).get("PointInTimeRecoveryEnabled") is not True:
        errors.append("token vault point-in-time recovery must be enabled")
    sse = ttp.get("SSESpecification", {})
    if sse.get("SSEEnabled") is not True or sse.get("SSEType") != "KMS":
        errors.append("token vault must use KMS encryption")
    if sse.get("KMSMasterKeyId") != {"Fn::GetAtt": ["TokenKmsKey", "Arn"]}:
        errors.append("token vault must use the token-specific KMS key")
    if token_table.get("DeletionPolicy") != "Retain":
        errors.append("token vault must be retained by default")

    audit_bucket = _resource(template, "AuditLogBucket")
    abp = audit_bucket.get("Properties", {})
    pab = abp.get("PublicAccessBlockConfiguration", {})
    if set(k for k, v in pab.items() if v is True) != {
        "BlockPublicAcls", "BlockPublicPolicy", "IgnorePublicAcls", "RestrictPublicBuckets"
    }:
        errors.append("audit bucket public-access block is incomplete")
    if abp.get("VersioningConfiguration", {}).get("Status") != "Enabled":
        errors.append("audit bucket versioning must be enabled")
    if abp.get("ObjectLockEnabled") is not True:
        errors.append("audit bucket object lock must be enabled")
    if audit_bucket.get("DeletionPolicy") != "Retain":
        errors.append("audit bucket must be retained")

    trail = _resource(template, "SecurityTrail").get("Properties", {})
    if trail.get("EnableLogFileValidation") is not True:
        errors.append("CloudTrail log-file validation must be enabled")
    if trail.get("IsMultiRegionTrail") is not True or trail.get("IncludeGlobalServiceEvents") is not True:
        errors.append("CloudTrail must cover all regions and global service events")
    if trail.get("IsLogging") is not True:
        errors.append("CloudTrail must start logging")
    if not trail.get("KMSKeyId"):
        errors.append("CloudTrail must use the log-specific KMS key")

    if dbp.get("KmsKeyId") == sse.get("KMSMasterKeyId"):
        errors.append("user-data and token-vault stores must not share a KMS key")

    if any(r.get("Type") in {"AWS::ApiGatewayV2::Route", "AWS::ApiGatewayV2::Integration"} for r in resources.values()):
        errors.append("Gate 2B must not add live API routes or integrations")

    return errors


def main() -> int:
    required = [
        TEMPLATE_PATH,
        ROOT / "infra" / "aws" / "gate2b" / "README.md",
        ROOT / "docs" / "security" / "GATE2B_AWS_FOUNDATION.md",
        ROOT / "docs" / "security" / "GATE2B_AWS_THREAT_MODEL.md",
        ROOT / "docs" / "security" / "GATE2B_DEPLOYMENT_APPROVAL.md",
        ROOT / "docs" / "security" / "GATE2B_AWS_SOURCE_RECORD.md",
        ROOT / "tests" / "test_gate2b.py",
        ROOT / ".github" / "workflows" / "gate2b-aws-foundation.yml",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        for path in missing:
            print(f"ERROR: missing Gate 2B file: {path}")
        return 1

    errors = validate_template(load_template())
    workflow = (ROOT / ".github" / "workflows" / "gate2b-aws-foundation.yml").read_text(encoding="utf-8")
    if "contents: read" not in workflow:
        errors.append("Gate 2B workflow must be read-only")
    if not re.search(r"actions/checkout@[0-9a-f]{40}\b", workflow):
        errors.append("checkout action must be pinned to a full SHA")
    if "persist-credentials: false" not in workflow:
        errors.append("checkout credentials must not persist")
    for forbidden in ("aws cloudformation deploy", "terraform apply", "aws-actions/configure-aws-credentials"):
        if forbidden in workflow:
            errors.append(f"workflow contains prohibited deployment capability: {forbidden}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("AEGIS Gate 2B AWS foundation contract passed")
    print("scope: review-only CloudFormation blueprint, explicit deployment brake, zero accounts or connectors")
    return 0


if __name__ == "__main__":
    sys.exit(main())
