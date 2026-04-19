# Discussion Review Cycle Playbook

Use this file for detailed review-pack handling in `/qfai-discussion`.

## Required Artifacts

- `review_request.md`
- `Rxx_<reviewer>.md`
- `summary.json`

## Cycle Rules

1. Create a new review pack for each cycle.
2. Apply the footer SSOT from `rcp_footer.md`.
3. Run only the routed reviewers for the current phase and conditions.
4. On `FAIL`, rerun only the failed reviewer and any reviewer whose scope changed.
5. Mark fixed only when all routed blocking reviewers are `PASS`.

## summary.json

- `target.kind` must be `"discussion"`.
- Keep rerun history append-only by storing each rerun as a new entry in a
  `cycles[]` array within the same `summary.json`.
- Treat `cycles[]` as append-only: add a new cycle object for each rerun, and
  do not rewrite or delete prior cycle entries.
