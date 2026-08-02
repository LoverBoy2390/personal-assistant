from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "plans" / "aws" / "gate2c" / "account-region-cost-plan.json"
SPEC = importlib.util.spec_from_file_location("verify_gate2c", ROOT / "scripts" / "verify_gate2c.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class Gate2CPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))

    def errors_for(self, mutator):
        candidate = copy.deepcopy(self.plan)
        mutator(candidate)
        return MODULE.verify(candidate)

    def test_canonical_plan_passes(self):
        self.assertEqual(MODULE.verify(copy.deepcopy(self.plan)), [])

    def test_rejects_deployment_approval(self):
        self.assertTrue(self.errors_for(lambda p: p.__setitem__("deploymentApproval", "APPROVED")))

    def test_rejects_connected_account(self):
        self.assertTrue(self.errors_for(lambda p: p.__setitem__("awsAccountConnected", True)))

    def test_rejects_region_sprawl(self):
        self.assertTrue(self.errors_for(lambda p: p.__setitem__("governedRegionsAtLaunch", ["us-east-1", "us-east-2"])))

    def test_rejects_management_workloads(self):
        self.assertTrue(self.errors_for(lambda p: p["organization"].__setitem__("workloadsInManagementAccount", True)))

    def test_rejects_production_account_activation(self):
        self.assertTrue(self.errors_for(lambda p: p["organization"].__setitem__("deferredAccounts", [])))

    def test_rejects_root_access_keys(self):
        self.assertTrue(self.errors_for(lambda p: p["humanAccess"].__setitem__("rootAccessKeys", "ALLOWED")))

    def test_rejects_long_lived_human_keys(self):
        self.assertTrue(self.errors_for(lambda p: p["humanAccess"].__setitem__("longLivedHumanAccessKeys", "ALLOWED")))

    def test_rejects_higher_cost_ceiling(self):
        self.assertTrue(self.errors_for(lambda p: p["costControls"].__setitem__("organizationMonthlyHardCeilingUsd", 100)))

    def test_rejects_automatic_budget_actions(self):
        self.assertTrue(self.errors_for(lambda p: p["costControls"].__setitem__("budgetActions", "AUTO_SHUTDOWN")))

    def test_rejects_missing_nat_prohibition(self):
        self.assertTrue(self.errors_for(lambda p: p["costControls"]["forbiddenCostDriversWithoutApproval"].remove("NAT_GATEWAY")))

    def test_rejects_service_side_validation_claim(self):
        self.assertTrue(self.errors_for(lambda p: p["validationBoundary"].__setitem__("serviceSideTemplateValidation", True)))


if __name__ == "__main__":
    unittest.main()
