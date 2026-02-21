# RCP Footer (SSOT)

## Review Cycle Protocol

## Review Targets

- Scope: `<discuss|require|sdd>`
- Pack / Layer: `<name>`
- Target files:
  - `<path>`
  - `<path>`

## Roster Execution Rule

- Load roster from `.qfai/assistant/steering/review-roster.yml`.
- Execute all roster entries in order for every review cycle.
- Each reviewer returns one of: `PASS`, `FAIL`, `N/A`.
- `N/A` is valid only with an explicit reason that satisfies `na_rule`.

## Return and Re-review Rule

- If any reviewer returns `FAIL`, stop and return to fixes immediately.
- After fixes, create a new review cycle and restart from the first reviewer.
- Do not skip reviewers in reruns.

## Fixed Gate Rule

- `fixed` is forbidden until all reviewers are `PASS` or valid `N/A`.
- Any unresolved `FAIL` keeps status in `changes_requested`.

## Required Review Artifacts

For each review cycle, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

## Validate Hard Gate Checks (Mandatory)

- Confirm `qfai validate --fail-on error --format github` ran in the latest cycle.
- Confirm `.qfai/report/validate.log` exists and corresponds to current artifacts.
- Confirm hard gates are all zero:
  - `QFAI-COV-201`
  - `QFAI-COV-202`
  - `QFAI-COV-203`
  - `QFAI-COV-204`
  - `QFAI-COV-205`
  - `QFAI-COV-206`

## Coverage Report Review (Mandatory)

- Review `.qfai/report/specs-coverage/spec-*.md` before marking fixed.
- Treat `QFAI-COV-207` as a density-smell signal and request perspective-based improvements (boundary/negative/permission/state), not raw count inflation.

`summary.json` minimum schema:

- `version`
- `created_at`
- `target`
- `roster`
- `overall_status`
