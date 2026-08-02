# AEGIS LifeOS Phase 0 Dependency Inventory

Date: 2026-08-02  
Baseline: `53130370293be2f419ab266aeaeac5570e964989`

## Application dependencies

The normalized AEGIS LifeOS v0.4.1 source contains no package-manager manifest or lockfile. It is a bundled static web application with a Python standard-library local server.

The Phase 0 pull-request workflow fails if it detects an unreviewed application dependency manifest such as `package.json`, `requirements.txt`, `pyproject.toml`, `Pipfile`, `Cargo.toml`, `go.mod`, or equivalent lockfiles.

## GitHub Actions used by Phase 0

- `actions/checkout@v6`

Existing baseline workflows also reference:

- `actions/upload-artifact@v4`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v4`
- `actions/deploy-pages@v4`

These action tags are external supply-chain dependencies. Major-version tags are not immutable commit pins, so action provenance and SHA pinning remain residual work before a production security gate.

## Unsupported repository feature

GitHub's `actions/dependency-review-action` was attempted on draft PR #5 and failed because the repository dependency graph is disabled. The unsupported job was removed rather than ignored or falsely reported as passing.

The replacement dependency-inventory gate proves only that Phase 0 introduces no package-manager manifests. It is not equivalent to GitHub dependency review, software composition analysis, or an independent supply-chain audit.

## Future requirements

Before external libraries or backend packages are introduced:

- Enable and review the repository dependency graph where appropriate.
- Commit lockfiles.
- Generate an SBOM.
- Scan known vulnerabilities and licenses.
- Pin CI actions to reviewed immutable commit SHAs.
- Define an update and emergency-patch process.
- Record the purpose, owner, version, source, and security impact of each dependency.
