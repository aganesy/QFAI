# 03 Acceptance Criteria

- `/qfai-verify` runs `qfai validate --fail-on error`.
- Verify inspects reviewer artifacts and blocks on `REVISE`.
- Validate imports and uses the canonical validator entrypoint.
- Removed compatibility surfaces are not present in the package surface.
- Design-system related validators continue to run when their prerequisite files/artifacts exist.
- Legacy `full-harness` wording inside validator slices is treated as artifact vocabulary, not as a public command contract.
