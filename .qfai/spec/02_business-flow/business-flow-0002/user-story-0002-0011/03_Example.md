# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                       | Expected                                                                                                                                                              |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0011-01 | AC-0002-0011-01 | A PR that adds `discussion-2026-05-27/` at the repository root, and one that adds it under `docs/`, when `check-pack-locations.mjs` runs in `pnpm ci:lint`  | Each fails the lane, emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes `.qfai/discussion/discussion-2026-05-27/` |
| EX-0002-0011-02 | AC-0002-0011-02 | A PR that adds `.qfai/discussion/discussion-20260527075558258/` (under an allowed root) and edits an unrelated README, when `check-pack-locations.mjs` runs | The lane passes silently with no `R-PACK-LOCATION-DRIFT`, and a pre-existing legacy `discussion-old/` directory at the root, untouched by the PR, is not re-flagged   |
