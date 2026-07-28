# Review Request

## Scope

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
- Root `DESIGN.md` completeness and differentiation clarity (when UI-bearing)
- Reference pool freshness and translation quality into `DESIGN.md` (when UI-bearing)
- Evaluator scoring covers all four canonical UX axes — information architecture / navigation flow / usability / functionality, fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` (when UI-bearing)
- Evaluator critique skepticism and blandness rejection quality applied against the four axes (when UI-bearing)
- Best-of-history handling and winner selection consistency (when UI-bearing)
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
- Allowed verdicts: `PASS`, `FAIL`.

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
