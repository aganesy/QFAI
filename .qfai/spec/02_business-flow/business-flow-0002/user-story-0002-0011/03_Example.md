# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                            | Expected                                                                                                                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0011-01 | AC-0002-0011-01 | Given a PR that adds `review-2026-05-27/` at the repository root (outside the allowed roots) When `check-pack-locations.mjs` runs in `pnpm ci:lint`              | Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes `.qfai/review/2026-05-27/` as the correct path |
| EX-0002-0011-02 | AC-0002-0011-02 | Given a PR that adds `.qfai/discussion/discussion-20260527075558258/` (under an allowed root) and edits an unrelated README When `check-pack-locations.mjs` runs | Then the lane passes silently with no `R-PACK-LOCATION-DRIFT`, and a pre-existing legacy `review-old/` directory untouched by the PR is not re-flagged                    |
