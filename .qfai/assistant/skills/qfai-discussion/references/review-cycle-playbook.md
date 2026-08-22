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
4. On `REVISE`, rerun only that reviewer and any reviewer whose scope changed. `REVISE` is the in-flight verdict (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`); it becomes `status: "FAIL"` only when the pack's `summary.json` is written.
5. Mark fixed only when all routed blocking reviewers are `PASS`.

## summary.json

- `target.kind` must be `"discussion"`.
- `revision_form: "content-hash"` and `revision` are written here too — the state these verdicts
  describe, as a git rev or `working-tree+<content hash>`
  (`../../qfai-implement/references/evidence-revision.md`). A pack without them raises
  `QFAI-REVIEW-007` in this stage's own hard gate
  (`npx qfai validate --profile discussion --fail-on error`, `rcp_footer.md`) as well as in the
  repo-wide `/qfai-verify --fail-on error`.
- Keep rerun history append-only.
