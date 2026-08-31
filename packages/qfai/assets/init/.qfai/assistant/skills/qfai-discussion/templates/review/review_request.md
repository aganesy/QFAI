# Review Request

## Scope

- Producer: `discussion`
- scope: `discussion-YYYYMMDDhhmmssSSS`
- layer: `discussion`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `<path/to/target-file-1>`
- `<path/to/target-file-2>`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Root `DESIGN.md` completeness and differentiation clarity — it parses, and its `# Brand Philosophy` body carries do/don't, brand signals, and exploration references framed as **deviate-from** inputs (when a visual-prototyping surface — `web`/`mobile`/`desktop`/`mixed` — is classified as primary or secondary; a cli-only pack authors no root `DESIGN.md`, so skip this line for it)
- Reference pool freshness and translation quality — into root `DESIGN.md` when a visual-prototyping surface is classified, otherwise into `uiux/40_screen_contracts.md` — and Trend Scan freshness and evidence traceability at `04_Sources.md#Trend Scan` (when UI-bearing)
- Canonical `uiux/` family complete — `00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md` — with no forbidden legacy sidecar (when UI-bearing)
- Evaluator scoring covers all four canonical UX axes — information architecture / navigation flow / usability / functionality, fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` (when UI-bearing)
- Evaluator critique skepticism and blandness rejection quality applied against the four axes (when UI-bearing)
- Planner-first discipline — exploration directions stay unranked, no single visual winner was selected (`qfai-discussion/SKILL.md`), and latest-iteration handling matches the one-lineage / no-best-of-history rule in `qfai-prototyping/SKILL.md` (when UI-bearing)
- Screen contract sufficiency and strong schema completeness (when UI-bearing)
- Generic fallback risk — ensure no unreviewed generic/placeholder UI remains (when UI-bearing)
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear.

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/manifest/agent-routing.yml` and `.qfai/assistant/manifest/review-profiles.yml`.
- Always run reviewers listed in `profiles.<routing_profile>.always_required` in `review-profiles.yml`.
- Add conditional reviewers according to `conditional_required` and related routing rules defined in `agent-routing.yml` and `review-profiles.yml` (do not introduce additional ad-hoc conditions in this template).
- Allowed in-flight verdicts: `PASS`, `REVISE`. `REVISE` is what starts the fix-and-rerun cycle; it serializes to `status: "FAIL"` when the pack's `summary.json` is written (see `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`).

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
