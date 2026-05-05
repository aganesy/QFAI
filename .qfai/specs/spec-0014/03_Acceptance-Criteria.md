# 03 Acceptance Criteria

## AC-0014-0001

- `/qfai-verify` runs full-scan validation rather than a diff-only shortcut.

## AC-0014-0002

- Verify inspects reviewer artifacts and blocks on `REVISE`.

## AC-0014-0003

- Validate imports and uses the canonical validator entrypoint.
- Removed compatibility surfaces are not present in the package surface.

## AC-0014-0004

- Design-system related validators continue to run when their prerequisite files/artifacts exist.
- Legacy `full-harness` wording inside validator slices is treated as artifact vocabulary, not as a public command contract.

## AC-0014-0005: Prototyping Evidence Path Layout

- Given a `/qfai-verify` run on a UI-bearing repo,
- When prototyping evidence is inspected,
- Then the active layout is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` per iter; the legacy `screenshots/` / `html/` directory layout is no longer accepted as the active SSOT.

## AC-0014-0006: Full-Harness Profile Drop

- Given the verify gate documentation and `review-profiles.yml`,
- When inspected,
- Then no "full-harness profile", "perfect-100 completion gate", or "weighted-total scoring" wording appears in the active surface; only the default profile remains active in `review-profiles.yml`.
