# AEGIS normalized source

`src/lifeos-v0.4.1` is generated from the accepted AEGIS LifeOS v0.4.1 production baseline at commit `53130370293be2f419ab266aeaeac5570e964989`.

The Phase 0 workflow:

1. Reconstructs the checksum-verified v0.4.0 archive.
2. Reconstructs and verifies the checksum-locked v0.4.1 patch.
3. Extracts the archive with path-traversal and symbolic-link rejection.
4. Applies the accepted patch.
5. Verifies every file listed in `BUILD-MANIFEST.json` by byte count and SHA-256.
6. Copies the exact result into `src/lifeos-v0.4.1`.
7. Runs the Phase 0 security-contract verifier.
8. Commits only the normalized source directory to the isolated review branch.

This does not redesign or replace the accepted application. It makes the existing baseline reviewable as normal source files.

Phase 0 boundaries:

- Synthetic data only.
- No personal data.
- No provider credentials or connections.
- No merge.
- No deployment.
- No publication.
- No claim of production readiness or independent security approval.
- Explicit approval is required before the next phase.
