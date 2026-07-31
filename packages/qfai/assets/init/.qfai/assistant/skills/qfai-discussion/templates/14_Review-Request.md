# 14 Review Request

## Scope

- scope: `discussion-YYYYMMDDhhmmssSSS`
- layer: `discussion`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/01_Context.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/02_Inception-Deck.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/03_Story-Workshop.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/04_Sources.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/05_Scope.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/06_REQ.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/07_NFR.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/08_Glossary.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/09_Constraints.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/10_Policy.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/11_OQ-Register.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/13_Deferred.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/14_Review-Request.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/99_delta.md`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only
- Root `DESIGN.md` completeness and differentiation clarity (when UI-bearing)
- Reference pool freshness and translation quality into `DESIGN.md` (when UI-bearing)
- Evaluator scoring covers all four canonical UX axes — information architecture / navigation flow / usability / functionality, fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` (when UI-bearing)
- Evaluator critique skepticism and blandness rejection quality applied against the four axes (when UI-bearing)
- Best-of-history handling and winner selection consistency (when UI-bearing)
- Screen contract sufficiency and strong schema completeness (when UI-bearing)
- Generic fallback risk — ensure no unreviewed generic/placeholder UI remains (when UI-bearing)
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

## Exploration Direction Consistency

<!-- Required for UI-bearing packs. Verifies brand SSOT and sidecar alignment. -->

- Brand SSOT: verify root `DESIGN.md` defines `brand`, `audience`, and `visual.*` tokens, and that `# Brand Philosophy` body documents product intent, must-preserve interactions, brand signals, and differentiation targets
- Evaluator axes: confirm reviewers will score against the four canonical UX axes (information architecture / navigation flow / usability / functionality) — these are fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` and no longer authored as sidecar files
- History handling: verify `uiux/50_review_input_bundle.md` documents best-of-history comparison instead of latest-only preference

## Sidecar Artifact Review Scope

<!-- Required for UI-bearing packs. Reviews root DESIGN.md + uiux/ sidecar artifacts. -->

- Verify root `DESIGN.md` is specific enough to support divergent exploration (front-matter populated, `# Brand Philosophy` body written, do/don't and reference notes framed as deviate-from inputs)
- Verify `uiux/50_review_input_bundle.md` preserves best-of-history handling
- Verify screen contracts use nested strong schema with all 4 required states (default/loading/empty/error) and treat `uiux/40_screen_contracts.md` as the state SSOT

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/manifest/agent-routing.yml` and `.qfai/assistant/manifest/review-profiles.yml`.
- Always run reviewers listed in `profiles.<routing_profile>.always_required` in `review-profiles.yml`.
- Add `architecture-reviewer` only when architecture-affecting decisions exist.
- Add `product-surface-reviewer` only when the pack is UI-bearing.
- Allowed in-flight verdicts: `PASS`, `REVISE`. `REVISE` is what starts the fix-and-rerun cycle; it serializes to `status: "FAIL"` when the pack's `summary.json` is written (see `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`).

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
