# 14 Review Request

## Scope

- scope: `discussion-YYYYMMDDhhmmssSSS`
- layer: `discussion`
- review-pack: `assigned per review cycle` — see `.qfai/review/`

<!-- Do NOT record a single review-pack id here. `references/review-cycle-playbook.md`
     requires a new review pack per cycle, so one discussion pack is reviewed by N packs.
     The authoritative pointer for a given cycle is that pack's own
     `.qfai/review/review-YYYYMMDDhhmmssSSS/review_request.md#Scope`, which names the directory that
     contains it. -->

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
- Root `DESIGN.md` completeness and differentiation clarity — it parses, and its `# Brand Philosophy` body carries do/don't, brand signals, and exploration references framed as **deviate-from** inputs (when a visual-prototyping surface — `web`/`mobile`/`desktop`/`mixed` — is classified as primary or secondary; a cli-only pack authors no root `DESIGN.md`, so skip this line for it)
- Reference pool freshness and translation quality — into root `DESIGN.md` when a visual-prototyping surface is classified, otherwise into `uiux/40_screen_contracts.md` — and Trend Scan freshness and evidence traceability at `04_Sources.md#Trend Scan` (when UI-bearing)
- Canonical `uiux/` family complete — `00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md` — with no forbidden legacy sidecar (when UI-bearing)
- Evaluator scoring covers all four canonical UX axes — information architecture / navigation flow / usability / functionality, fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` (when UI-bearing)
- Evaluator critique skepticism and blandness rejection quality applied against the four axes (when UI-bearing)
- Planner-first discipline — exploration directions stay unranked, no single visual winner was selected (`qfai-discussion/SKILL.md`), and latest-iteration handling matches the one-lineage / no-best-of-history rule in `qfai-prototyping/SKILL.md` (when UI-bearing)
- Screen contract sufficiency and strong schema completeness (when UI-bearing)
- Generic fallback risk — ensure no unreviewed generic/placeholder UI remains (when UI-bearing)
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

## Exploration Direction Consistency

<!-- Required for UI-bearing packs. Verifies brand SSOT and sidecar alignment. -->

- Brand SSOT (skip on a cli-only pack; required as soon as `web`/`mobile`/`desktop`/`mixed` appears as primary or secondary surface): verify root `DESIGN.md` defines `brand`, `audience`, and `visual.*` tokens, and that `# Brand Philosophy` body documents product intent, must-preserve interactions, brand signals, and differentiation targets
- Evaluator axes: confirm reviewers will score against the four canonical UX axes (information architecture / navigation flow / usability / functionality) — these are fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES` and no longer authored as sidecar files
- History handling: verify `uiux/50_review_input_bundle.md` matches the one-lineage rule in `qfai-prototyping/SKILL.md` — no parallel candidates, no best-of-history, the latest iteration is accepted

## Sidecar Artifact Review Scope

<!-- Required for UI-bearing packs. Reviews root DESIGN.md (visual-prototyping surfaces) + uiux/ sidecar artifacts (every UI-bearing surface, cli included). -->

- Verify root `DESIGN.md` is specific enough (skip on a cli-only pack, which authors none) to support divergent exploration (front-matter populated, `# Brand Philosophy` body written, do/don't and reference notes framed as deviate-from inputs)
- Verify `uiux/50_review_input_bundle.md` states the one-lineage handling (latest iteration accepted, no best-of-history)
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
