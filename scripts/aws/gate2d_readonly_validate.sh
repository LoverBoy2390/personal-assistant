#!/usr/bin/env bash
set -euo pipefail

# Gate 2D read-only AWS validation.
# This script refuses static access keys, writes evidence only outside the repository,
# and invokes no create, update, delete, deploy, change-set, or connector operation.

: "${AEGIS_AWS_PROFILE:?Set AEGIS_AWS_PROFILE to an IAM Identity Center profile.}"
: "${AEGIS_EXPECTED_ACCOUNT_ID:?Set AEGIS_EXPECTED_ACCOUNT_ID to the owner-approved 12-digit account ID.}"
AEGIS_EXPECTED_REGION="${AEGIS_EXPECTED_REGION:-us-east-1}"
AEGIS_EVIDENCE_DIR="${AEGIS_EVIDENCE_DIR:-/tmp/aegis-gate2d}"

case "$AEGIS_EXPECTED_ACCOUNT_ID" in
  (*[!0-9]*|'') echo "Expected account ID must contain digits only." >&2; exit 2 ;;
esac
if [ "${#AEGIS_EXPECTED_ACCOUNT_ID}" -ne 12 ]; then
  echo "Expected account ID must be exactly 12 digits." >&2
  exit 2
fi
if [ "$AEGIS_EXPECTED_REGION" != "us-east-1" ]; then
  echo "Gate 2D is locked to us-east-1." >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
mkdir -p "$AEGIS_EVIDENCE_DIR"
evidence_real="$(cd "$AEGIS_EVIDENCE_DIR" && pwd -P)"
repo_real="$(cd "$repo_root" && pwd -P)"
case "$evidence_real/" in
  "$repo_real/"*) echo "Evidence directory must be outside the repository." >&2; exit 2 ;;
esac
chmod 700 "$evidence_real"

if [ -n "$(aws configure get aws_access_key_id --profile "$AEGIS_AWS_PROFILE" 2>/dev/null || true)" ]; then
  echo "Static access keys are prohibited. Use IAM Identity Center temporary credentials." >&2
  exit 2
fi

aws_args=(--profile "$AEGIS_AWS_PROFILE" --region "$AEGIS_EXPECTED_REGION" --output json --no-cli-pager)

aws sts get-caller-identity "${aws_args[@]}" >"$evidence_real/caller-identity.json"
actual_account="$(python3 - "$evidence_real/caller-identity.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["Account"])
PY
)"
if [ "$actual_account" != "$AEGIS_EXPECTED_ACCOUNT_ID" ]; then
  echo "Connected account does not match the owner-approved account ID." >&2
  exit 3
fi

# Organization calls can return AccessDenied or not-in-organization before the landing zone exists.
# Record those responses without changing state.
run_optional() {
  local name="$1"; shift
  if ! "$@" >"$evidence_real/$name.json" 2>"$evidence_real/$name.stderr"; then
    python3 - "$evidence_real/$name.stderr" "$evidence_real/$name.json" <<'PY'
import json, pathlib, sys
err = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
pathlib.Path(sys.argv[2]).write_text(json.dumps({"status":"NOT_AVAILABLE","errorClass":err.split(":",1)[0][:160]}, indent=2)+"\n", encoding="utf-8")
PY
  fi
  rm -f "$evidence_real/$name.stderr"
}

run_optional organization aws organizations describe-organization "${aws_args[@]}"
run_optional accounts aws organizations list-accounts "${aws_args[@]}"
run_optional roots aws organizations list-roots "${aws_args[@]}"
run_optional landing-zones aws controltower list-landing-zones "${aws_args[@]}"

aws cloudformation validate-template \
  --template-body file://infra/aws/gate2b/foundation.json \
  "${aws_args[@]}" >"$evidence_real/cloudformation-validation.json"

run_optional cloudformation-quotas \
  aws service-quotas list-service-quotas --service-code cloudformation "${aws_args[@]}"

python3 - "$evidence_real" <<'PY'
import hashlib, json, pathlib, sys
root = pathlib.Path(sys.argv[1])
records = []
for path in sorted(root.glob("*.json")):
    data = path.read_bytes()
    records.append({"file": path.name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
(root / "manifest.json").write_text(json.dumps({
    "status": "READ_ONLY_VALIDATION_COMPLETE",
    "containsAccountMetadata": True,
    "mustNotBeCommitted": True,
    "records": records
}, indent=2) + "\n", encoding="utf-8")
PY
chmod 600 "$evidence_real"/*.json
echo "Gate 2D read-only validation completed. Evidence remains outside the repository: $evidence_real"
