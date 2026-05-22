# SDD Review Cycle Playbook

Use this file when you need the detailed review-cycle mechanics for `/qfai-sdd`.

## Inputs

- `.qfai/assistant/steering/agent-routing.yml`
- `.qfai/assistant/steering/review-profiles.yml`
- `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`

## Review Cycle

1. Select reviewers from routing and profile rules.
2. Build one review pack for the current cycle only.
3. Apply the footer SSOT without rewriting it locally.
4. Collect verdicts.
5. If any blocking reviewer returns `FAIL`, fix only the affected scope and rerun the failed reviewer plus any reviewer whose scope changed.
6. Mark the cycle fixed only when all routed blocking reviewers return `PASS`.

## Required Outputs

- `review_request.md`
- `Rxx_<reviewer>.md`
- evidence updates showing what changed after each failed cycle

## summary.json

- `target.kind` must be `"spec"` for SDD review packs.
- Accepted serialized reviewer statuses are `PASS`, `FAIL`, and `NA`.

## Guardrails

- Do not self-approve.
- Do not collapse `PASS` and `FAIL` into informal prose.
- Do not rerun unrelated reviewers after a localized fix.
