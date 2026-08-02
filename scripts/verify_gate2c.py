#!/usr/bin/env python3
"""Verify the AEGIS Gate 2C account/region/cost planning boundary."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "plans" / "aws" / "gate2c" / "account-region-cost-plan.json"
REQUIRED_FILES = [
    PLAN_PATH,
    ROOT / "docs" / "security" / "GATE2C_ACCOUNT_REGION_COST_PLAN.md",
    ROOT / "docs" / "security" / "GATE2C_ACCOUNT_CREATION_CHECKLIST.md",
    ROOT / "docs" / "security" / "GATE2C_COST_MODEL.md",
    ROOT / "docs" / "security" / "GATE2C_SOURCE_RECORD.md",
    ROOT / "infra" / "aws" / "gate2c" / "README.md",
    ROOT / "tests" / "test_gate2c.py",
    ROOT / ".github" / "workflows" / "gate2c-account-region-cost.yml",
]


def verify(plan: dict) -> list[str]:
    errors: list[str] = []
    require = lambda condition, message: errors.append(message) if not condition else None

    require(plan.get("status") == "REVIEW_ONLY_NOT_APPLIED", "plan status must remain review-only")
    require(plan.get("deploymentApproval") == "NOT_APPROVED", "deployment approval must remain NOT_APPROVED")
    require(plan.get("awsAccountConnected") is False, "AWS account must remain disconnected")
    require(plan.get("billingEnabledByAssistant") is False, "assistant must not enable billing")
    require(plan.get("primaryRegion") == "us-east-1", "primary Region must be us-east-1")
    require(plan.get("governedRegionsAtLaunch") == ["us-east-1"], "only us-east-1 may be governed at launch")
    require(plan.get("recoveryRegionActivation") == "SEPARATE_APPROVAL_REQUIRED", "recovery Region must remain inactive")

    org = plan.get("organization", {})
    require(org.get("landingZone") == "AWS_CONTROL_TOWER", "Control Tower landing-zone plan required")
    require(org.get("organizationPlan") == "PAID_PAY_AS_YOU_GO_INTENTIONAL", "paid-plan transition must be intentional")
    require(org.get("workloadsInManagementAccount") is False, "management account must contain no workloads")
    accounts = {item.get("name"): item for item in org.get("accounts", [])}
    for name in ["aegis-management", "aegis-log-archive", "aegis-security-audit", "aegis-nonprod"]:
        require(name in accounts, f"missing planned account: {name}")
    require("aegis-production" in org.get("deferredAccounts", []), "production account must remain deferred")

    access = plan.get("humanAccess", {})
    require(access.get("rootMfa") == "PASSKEY_OR_HARDWARE_SECURITY_KEY_WITH_BACKUP", "phishing-resistant root MFA required")
    require(access.get("rootAccessKeys") == "PROHIBITED", "root access keys must be prohibited")
    require(access.get("longLivedHumanAccessKeys") == "PROHIBITED", "long-lived human access keys must be prohibited")
    require(access.get("temporaryFederatedCredentialsRequired") is True, "temporary federated credentials required")
    require(access.get("centralizedMemberRootAccess") is True, "centralized member-root access required")
    require(access.get("removeMemberRootCredentials") is True, "member root credentials must be removed")

    costs = plan.get("costControls", {})
    require(costs.get("organizationMonthlyHardCeilingUsd") == 50, "organization hard ceiling must be $50")
    require(costs.get("nonprodMonthlyTargetUsd") <= 25, "nonprod target must not exceed $25")
    require(costs.get("nonprodMonthlyStopReviewUsd") <= 35, "stop/review threshold must not exceed $35")
    require(costs.get("budgetThresholdsUsd") == [1, 10, 25, 40, 50], "budget thresholds changed")
    require(costs.get("zeroSpendBudgetBeforeLandingZone") is True, "zero-spend budget must precede landing zone")
    require(costs.get("budgetActions") == "ALERT_ONLY_UNTIL_SEPARATELY_REVIEWED", "automatic budget actions are not approved")
    anomaly = costs.get("costAnomalyDetection", {})
    require(anomaly.get("absoluteAlertThresholdUsd", 999) <= 1, "anomaly alert threshold must be $1 or less")

    forbidden = set(costs.get("forbiddenCostDriversWithoutApproval", []))
    for item in ["NAT_GATEWAY", "PUBLIC_IPV4_ADDRESS", "PROVISIONED_ALWAYS_ON_COMPUTE", "MULTI_REGION_REPLICATION"]:
        require(item in forbidden, f"missing forbidden cost driver: {item}")

    boundary = plan.get("validationBoundary", {})
    for key, value in boundary.items():
        require(value is False, f"validation boundary must remain false: {key}")

    require(plan.get("nextExplicitApproval") == "GATE_2D_ACCOUNT_CREATION_AND_READ_ONLY_SERVICE_VALIDATION", "next approval boundary changed")
    return errors


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED_FILES:
        if not path.is_file():
            errors.append(f"missing Gate 2C file: {path.relative_to(ROOT)}")
    if PLAN_PATH.is_file():
        try:
            errors.extend(verify(json.loads(PLAN_PATH.read_text(encoding="utf-8"))))
        except json.JSONDecodeError as exc:
            errors.append(f"invalid plan JSON: {exc}")

    workflow = ROOT / ".github" / "workflows" / "gate2c-account-region-cost.yml"
    if workflow.is_file():
        text = workflow.read_text(encoding="utf-8")
        for marker in [
            "contents: read",
            "persist-credentials: false",
            "python3 scripts/verify_gate2c.py",
            "python3 -m unittest tests/test_gate2c.py",
        ]:
            if marker not in text:
                errors.append(f"workflow missing boundary marker: {marker}")
        if "aws-actions/" in text or "configure-aws-credentials" in text or "cloudformation deploy" in text:
            errors.append("Gate 2C workflow must not authenticate to or deploy on AWS")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("AEGIS Gate 2C account/region/cost plan passed")
    print("scope: us-east-1, four-account plan, $50 ceiling, no AWS account or deployment")
    return 0


if __name__ == "__main__":
    sys.exit(main())
