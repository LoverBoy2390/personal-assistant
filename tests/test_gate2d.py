import json, pathlib, re, unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN = json.loads((ROOT / "plans/aws/gate2d/read-only-validation-plan.json").read_text())
POLICY = json.loads((ROOT / "infra/aws/gate2d/readonly-validation-policy.json").read_text())
RUNNER = (ROOT / "scripts/aws/gate2d_readonly_validate.sh").read_text()
WORKFLOW = (ROOT / ".github/workflows/gate2d-readonly-validation.yml").read_text()

def allowed_actions(policy):
    result = []
    for s in policy["Statement"]:
        if s["Effect"] == "Allow":
            result.extend(s["Action"] if isinstance(s["Action"], list) else [s["Action"]])
    return result

class Gate2DTests(unittest.TestCase):
    def test_prepared_not_executed(self):
        self.assertEqual(PLAN["status"], "PREPARED_NOT_EXECUTED")
        self.assertFalse(PLAN["awsAccountConnected"])
        self.assertFalse(PLAN["accountCreationExecuted"])
        self.assertFalse(PLAN["serviceSideValidationExecuted"])

    def test_region_locked(self):
        self.assertEqual(PLAN["primaryRegion"], "us-east-1")
        self.assertEqual(PLAN["temporaryAccess"]["defaultExpectedRegion"], "us-east-1")

    def test_no_resource_or_connector_authorization(self):
        self.assertFalse(PLAN["resourceCreationAuthorized"])
        self.assertFalse(PLAN["providerConnectorAuthorized"])

    def test_temporary_credentials_only(self):
        self.assertEqual(PLAN["temporaryAccess"]["method"], "IAM_IDENTITY_CENTER_SSO")
        self.assertEqual(PLAN["temporaryAccess"]["longLivedHumanAccessKeys"], "PROHIBITED")

    def test_policy_allows_only_read_style_verbs(self):
        bad = []
        for action in allowed_actions(POLICY):
            verb = action.split(":",1)[1]
            if re.match(r"(?i)^(Create|Update|Delete|Put|Attach|Detach|Enable|Disable|Execute|Provision|Close|Leave|Invite|Move)", verb):
                bad.append(action)
        self.assertEqual(bad, [])

    def test_policy_denies_sensitive_reads(self):
        deny = []
        for s in POLICY["Statement"]:
            if s["Effect"] == "Deny":
                deny.extend(s["Action"])
        self.assertIn("secretsmanager:GetSecretValue", deny)
        self.assertIn("kms:Decrypt", deny)
        self.assertIn("ssm:GetParametersByPath", deny)

    def test_policy_denies_cloudformation_mutation(self):
        deny = []
        for s in POLICY["Statement"]:
            if s["Effect"] == "Deny":
                deny.extend(s["Action"])
        self.assertIn("cloudformation:Create*", deny)
        self.assertIn("cloudformation:ExecuteChangeSet", deny)

    def test_runner_has_no_account_creation(self):
        self.assertNotRegex(RUNNER, r"\baws\s+organizations\s+create-account\b")
        self.assertNotRegex(RUNNER, r"\baws\s+organizations\s+create-organization\b")

    def test_runner_has_no_stack_creation(self):
        self.assertNotRegex(RUNNER, r"\baws\s+cloudformation\s+(?:create|deploy|update|delete)")

    def test_runner_rejects_static_access_keys(self):
        self.assertIn("Static access keys are prohibited", RUNNER)
        self.assertIn("aws configure get aws_access_key_id", RUNNER)

    def test_runner_checks_account_and_region(self):
        self.assertIn("AEGIS_EXPECTED_ACCOUNT_ID", RUNNER)
        self.assertIn('AEGIS_EXPECTED_REGION" != "us-east-1"', RUNNER)
        self.assertIn("aws sts get-caller-identity", RUNNER)

    def test_evidence_outside_repository(self):
        self.assertEqual(PLAN["temporaryAccess"]["evidenceDirectory"], "/tmp/aegis-gate2d")
        self.assertIn("Evidence directory must be outside the repository", RUNNER)

    def test_workflow_never_authenticates_to_aws(self):
        self.assertNotIn("aws-actions/configure-aws-credentials", WORKFLOW)
        self.assertNotIn("aws cloudformation", WORKFLOW)
        self.assertNotIn("aws organizations", WORKFLOW)

    def test_validate_template_scope_is_honest(self):
        self.assertIn("NOT_FULL_RESOURCE_PROPERTY_OR_DEPLOYMENT_ASSURANCE",
                      PLAN["readOnlyValidation"]["templateValidationLimit"])
        self.assertFalse(PLAN["readOnlyValidation"]["cloudFormationChangeSet"])
        self.assertFalse(PLAN["readOnlyValidation"]["cloudFormationStack"])

if __name__ == "__main__":
    unittest.main()
