# SDD Review Cycle Playbook

Use this file when you need the detailed review-cycle mechanics for `/qfai-sdd`.

## Inputs

- `.qfai/assistant/manifest/agent-routing.yml`
- `.qfai/assistant/manifest/review-profiles.yml`
- `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`

## Review Cycle

1. Select reviewers from routing and profile rules.
2. Build one review pack for the current cycle only.
3. Apply the footer SSOT without rewriting it locally.
4. Collect verdicts.
5. If any blocking reviewer returns `REVISE`, fix only the affected scope and rerun that reviewer plus any reviewer whose scope changed. `REVISE` is the in-flight verdict (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`); it becomes `status: "FAIL"` only when the pack's `summary.json` is written.
6. Mark the cycle fixed only when all routed blocking reviewers return `PASS`.

## Required Outputs

- `review_request.md`
- `Rxx_<reviewer>.md`
- evidence updates showing what changed after each failed cycle

## summary.json

- `target.kind` must be `"spec"` for SDD review packs, and `target.path` must be the spec directory
  it names — a `kind` the path contradicts raises `QFAI-REVIEW-007` and is ignored when deciding
  which gate the pack faces.
- `producer` must be `"sdd"`, and `review_request.md` carries a matching `Producer: sdd` line so the
  pack is placed before `summary.json` exists. This is what makes the gate below yours:
  `qfai-implement` writes `target.kind: "spec"` for its own packs too, so kind alone put a
  downstream worker's in-flight pack in your gate.
- Accepted serialized reviewer statuses are `PASS`, `FAIL`, and `NA`.
- `revision_form: "content-hash"` and `revision` are written like every other pack producer does:
  the state these verdicts describe, as a git rev or `working-tree+<content hash>`
  (`../../qfai-implement/references/evidence-revision.md`). A pack written without them raises
  `QFAI-REVIEW-007` in this stage's own hard gate
  (`npx qfai validate --profile sdd --fail-on error`, `rcp_footer.md`) as well as in the repo-wide
  `/qfai-verify --fail-on error`.
- That gate judges `producer: "sdd"` packs only — a discussion cycle's pack is
  `--profile discussion`'s business and an implementation pack is the full scan's — and a pack that
  declares no owner at all is judged by both stage gates, since no other gate would see it. A pack
  that names no producer falls back to its `target.kind`, so a legacy `"spec"` pack stays in this
  gate.
- Adding `--spec <id>` narrows the check to the packs attributed to that spec: by
  `summary.json#target.path`, or by the paths `review_request.md` names when `summary.json` is
  missing or unparseable. A parallel worker therefore never gates on a sibling's in-flight pack,
  while its own pack that forgot `summary.json` is still caught.

## Guardrails

- Do not self-approve.
- Do not collapse `PASS` and `FAIL` into informal prose.
- Do not rerun unrelated reviewers after a localized fix.
