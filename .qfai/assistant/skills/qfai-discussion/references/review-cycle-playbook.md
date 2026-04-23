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
- Keep rerun history append-only.
