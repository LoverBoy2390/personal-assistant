from __future__ import annotations

import copy
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("verify_gate2b", ROOT / "scripts" / "verify_gate2b.py")
verify_gate2b = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(verify_gate2b)


class Gate2BContractTests(unittest.TestCase):
    def setUp(self):
        self.template = verify_gate2b.load_template()

    def assert_invalid(self, mutated, phrase):
        errors = verify_gate2b.validate_template(mutated)
        self.assertTrue(any(phrase in error for error in errors), errors)

    def test_review_template_passes(self):
        self.assertEqual(verify_gate2b.validate_template(self.template), [])

    def test_resource_without_approval_condition_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["ProtectedApi"].pop("Condition")
        self.assert_invalid(mutated, "not protected by DeploymentApproved")

    def test_public_database_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["DatabaseInstance1"]["Properties"]["PubliclyAccessible"] = True
        self.assert_invalid(mutated, "must not be publicly accessible")

    def test_implicit_oauth_flow_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["UserPoolClient"]["Properties"]["AllowedOAuthFlows"] = ["code", "implicit"]
        self.assert_invalid(mutated, "only OAuth authorization-code flow")

    def test_shared_data_and_token_key_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["TokenVaultTable"]["Properties"]["SSESpecification"]["KMSMasterKeyId"] = {
            "Fn::GetAtt": ["DataKmsKey", "Arn"]
        }
        self.assert_invalid(mutated, "token-specific KMS key")
        self.assert_invalid(mutated, "must not share a KMS key")

    def test_disabled_refresh_rotation_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["UserPoolClient"]["Properties"]["RefreshTokenRotation"]["Feature"] = "DISABLED"
        self.assert_invalid(mutated, "refresh-token rotation")

    def test_public_ingress_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["AppSecurityGroup"]["Properties"]["SecurityGroupIngress"] = [{
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "CidrIp": "0.0.0.0/0"
        }]
        self.assert_invalid(mutated, "contains public ingress")

    def test_live_api_integration_is_rejected(self):
        mutated = copy.deepcopy(self.template)
        mutated["Resources"]["PrematureIntegration"] = {
            "Type": "AWS::ApiGatewayV2::Integration",
            "Condition": "DeploymentApproved",
            "Properties": {}
        }
        self.assert_invalid(mutated, "must not add live API routes or integrations")

    def test_placeholder_deployment_default_cannot_change(self):
        mutated = copy.deepcopy(self.template)
        mutated["Parameters"]["DeploymentApproval"]["Default"] = "APPROVE_GATE2B_DEPLOYMENT"
        self.assert_invalid(mutated, "must default to NOT_APPROVED")


if __name__ == "__main__":
    unittest.main()
