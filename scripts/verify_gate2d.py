#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "plans/aws/gate2d/read-only-validation-plan.json"
POLICY = ROOT / "infra/aws/gate2d/readonly-validation-policy.json"
RUNNER = ROOT / "scripts/aws/gate2d_readonly_validate.sh"
WORKFLOW = ROOT / ".github/workflows/gate2d-readonly-validation.yml"
REQUIRED = [
    PLAN, POLICY, RUNNER, WORKFLOW,
    ROOT / "infra/aws/gate2d/README.md",
    ROOT / "docs/security/GATE2D_ACCOUNT_BOOTSTRAP.md",
    ROOT / "docs/security/GATE2D_READ_ONLY_VALIDATION.md",
    ROOT / "docs/security/GATE2D_SOURCE_RECORD.md",
    ROOT / "tests/test_gate2d.py",
]
FORBIDDEN_EXECUTABLE_PATTERNS = {
    "account creation": r"\baws\s+organizations\s+create-account\b",
    "organization creation": r"\baws\s+organizations\s+create-organization\b",
    "control tower mutation": r"\baws\s+controltower\s+(?:create|update|delete|enable|disable)",
    "stack mutation": r"\baws\s+cloudformation\s+(?:create|update|delete|deploy|execute-change-set|create-change-set)",
    "iam mutation": r"\baws\s+iam\s+(?:create|update|delete|put|attach|detach)",
    "budget mutation": r"\baws\s+budgets\s+(?:create|update|delete)",
    "secret read": r"\baws\s+(?:secretsmanager\s+get-secret-value|ssm\s+get-parameter|kms\s+decrypt)",
    "embedded static credential environment variable": r"(?-i:\bAWS_ACCESS_KEY_ID\b|\bAWS_SECRET_ACCESS_KEY\b)",
    "embedded static credential assignment": r"aws_access_key_id\s*=",
}

def main() -> int:
    errors = []
    for path in REQUIRED:
        if not path.is_file():
            errors.append(f"missing file: {path.relative_to(ROOT)}")
    if errors:
        print("\n".join("ERROR: "+x for x in errors))
        return 1

    plan = json.loads(PLAN.read_text())
    expected_false = [
        "awsAccountConnected", "accountCreationExecuted", "awsOrganizationCreated",
        "controlTowerLaunched", "billingActionExecuted", "awsCredentialsStored",
        "serviceSideValidationExecuted", "resourceCreationAuthorized",
        "providerConnectorAuthorized",
    ]
    for key in expected_false:
        if plan.get(key) is not False:
            errors.append(f"plan must keep {key}=false")
    if plan.get("primaryRegion") != "us-east-1":
        errors.append("primary Region must remain us-east-1")
    if plan.get("status") != "PREPARED_NOT_EXECUTED":
        errors.append("status must remain PREPARED_NOT_EXECUTED")
    if plan["temporaryAccess"].get("method") != "IAM_IDENTITY_CENTER_SSO":
        errors.append("temporary IAM Identity Center access is required")
    if plan["completion"].get("gateExecutionComplete") is not False:
        errors.append("Gate execution must remain incomplete without AWS evidence")

    policy = json.loads(POLICY.read_text())
    allowed = []
    denied = []
    for statement in policy.get("Statement", []):
        actions = statement.get("Action", [])
        if isinstance(actions, str): actions = [actions]
        (allowed if statement.get("Effect") == "Allow" else denied).extend(actions)
    for action in allowed:
        verb = action.split(":",1)[1]
        if re.match(r"(?i)^(Create|Update|Delete|Put|Attach|Detach|Enable|Disable|Execute|Provision|Close|Leave|Invite|Move)", verb):
            errors.append(f"mutating action allowed: {action}")
    for required in [
        "sts:GetCallerIdentity", "cloudformation:ValidateTemplate",
        "organizations:DescribeOrganization", "controltower:ListLandingZones",
    ]:
        if required not in allowed:
            errors.append(f"missing required read-only action: {required}")
    for required in [
        "cloudformation:Create*", "organizations:Create*",
        "secretsmanager:GetSecretValue", "kms:Decrypt",
    ]:
        if required not in denied:
            errors.append(f"missing explicit deny: {required}")

    runner_text = RUNNER.read_text()
    for label, pattern in FORBIDDEN_EXECUTABLE_PATTERNS.items():
        if re.search(pattern, runner_text, re.I):
            errors.append(f"runner contains prohibited capability: {label}")
    for marker in [
        "AEGIS_AWS_PROFILE", "AEGIS_EXPECTED_ACCOUNT_ID", "us-east-1",
        "aws sts get-caller-identity", "aws cloudformation validate-template",
        "Evidence directory must be outside the repository",
        "Static access keys are prohibited",
    ]:
        if marker not in runner_text:
            errors.append(f"runner missing safeguard: {marker}")

    workflow = WORKFLOW.read_text()
    if "contents: read" not in workflow:
        errors.append("workflow must be read-only")
    if not re.search(r"actions/checkout@[0-9a-f]{40}\b", workflow):
        errors.append("checkout must be pinned to a full SHA")
    if "persist-credentials: false" not in workflow:
        errors.append("workflow must disable persisted credentials")
    for forbidden in ["aws-actions/configure-aws-credentials", "aws cloudformation", "aws organizations", "aws controltower"]:
        if forbidden in workflow:
            errors.append(f"workflow must not contact AWS: {forbidden}")

    if errors:
        print("\n".join("ERROR: "+x for x in errors))
        return 1
    print("AEGIS Gate 2D preparation contract passed")
    print("scope: owner-controlled account bootstrap and read-only validation package; no AWS account connected or mutated")
    return 0

if __name__ == "__main__":
    sys.exit(main())
