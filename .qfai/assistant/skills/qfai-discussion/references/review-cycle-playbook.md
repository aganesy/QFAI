# Discussion Review Cycle Playbook

Use this file for detailed review-pack handling in `/qfai-discussion`.

## Required Artifacts

Every review cycle writes its pack into the shared review tree — the same tree `/qfai-sdd` uses and
the only one `npx qfai validate` reads. The directory name is `review-` plus a **17-digit**
timestamp (`YYYYMMDDhhmmssSSS`, the same shape as the discussion pack's own id); any other
spelling — Unix seconds, milliseconds, an ISO string — is not listed as a pack at all, and a
tree with no packs only warns, so the cycle passes `--fail-on error` unreviewed:

- `.qfai/review/review-YYYYMMDDhhmmssSSS/review_request.md`
- `.qfai/review/review-YYYYMMDDhhmmssSSS/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-YYYYMMDDhhmmssSSS/summary.json`

## Cycle Rules

1. Create a new review pack for each cycle.
2. Apply the footer SSOT from `rcp_footer.md`.
3. Run only the routed reviewers for the current phase and conditions.
4. On `REVISE`, rerun only that reviewer and any reviewer whose scope changed. `REVISE` is the in-flight verdict (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`); it becomes `status: "FAIL"` only when the pack's `summary.json` is written.
5. Mark fixed only when all routed blocking reviewers are `PASS`.

## summary.json

- `target.kind` must be `"discussion"` and `target.path` must be the discussion pack it names — a
  `kind` the path contradicts raises `QFAI-REVIEW-007` and is ignored when deciding which gate the
  pack faces.
- `producer` must be `"discussion"`, and `review_request.md` carries a matching
  `Producer: discussion` line so the pack is placed before `summary.json` exists. That is what
  makes this stage's gate yours: it judges `producer: "discussion"` packs only, so neither an SDD
  worker's in-flight spec pack nor an implementation one ever fails a discussion cycle. A pack that
  declares no owner at all is judged by both stages, since no other gate would see it.
- A discussion pack belongs to no spec, so a `--spec` run keeps it: it is a repo-level finding, and
  those stay in every slice.
- `revision_form: "content-hash"` and `revision` are written here too — the state these verdicts
  describe, as a git rev or `working-tree+<content hash>`
  (`../../qfai-implement/references/evidence-revision.md`). A pack without them raises
  `QFAI-REVIEW-007` in this stage's own hard gate
  (`npx qfai validate --profile discussion --fail-on error`, `rcp_footer.md`) as well as in the
  repo-wide `/qfai-verify --fail-on error`.
- Keep rerun history append-only.
