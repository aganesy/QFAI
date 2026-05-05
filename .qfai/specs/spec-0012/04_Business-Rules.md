# 04 Business Rules

## BR-0012-0001: Skill-First Interface

- AC-Refs: AC-0012-0001
- `/qfai-prototyping` is the active interface.
- `qfai prototyping` is not an active public orchestration command (only `iterate` / `certify` / `show-spec` sub-commands are public).

## BR-0012-0002: Mandatory UI Evidence

- AC-Refs: AC-0012-0002
- Every declared screen in `.qfai/contracts/ui/*.yaml` must have, per iter:
  - `.qfai/evidence/prototyping/iter-NN/<screen>.png`
  - `.qfai/evidence/prototyping/iter-NN/<screen>.html`

## BR-0012-0003: Missing Evidence Is Fail-Closed

- AC-Refs: AC-0012-0003
- If either the screenshot or HTML snapshot is missing, the screen is treated as incomplete.
- The iteration cannot be accepted until evidence is re-captured.

## BR-0012-0004: Evaluator Roles

- AC-Refs: AC-0012-0004
- Generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be different sub-agents (self-preference bias prevention).
- Capture (devops-ci-engineer) is a third role.

## BR-0012-0005: Evaluator Inputs

- AC-Refs: AC-0012-0005
- Reviewer evaluation uses screenshots, HTML snapshots, root `DESIGN.md`, prior reviewer review.json context, and the lap-* catalog.
- Reviewer findings must explicitly name missing mandatory inputs.

## BR-0012-0006: Validate Gate

- AC-Refs: AC-0012-0006
- `qfai validate --fail-on error` is the machine gate for schema/evidence integrity.
- Validate does not replace human/sub-agent evaluation.

## BR-0012-0007: Verify Gate

- AC-Refs: AC-0012-0007
- `/qfai-verify` confirms validate pass, review artifact presence, and unresolved blocking findings.
- Completion is blocked on `REVISE`.

## BR-0012-0008: Legacy Validation Slice

- AC-Refs: AC-0012-0008
- The following artifacts may still be validated when present (history-only, no active runtime contract):
  - `executionPlan`
  - Lighthouse evidence for legacy web validation
  - `designSystemCompliance`
  - calibration overrides
- These checks are validator/reference behavior only and must not be interpreted as a public runtime contract.

## BR-0012-0009: Non-UI Exclusion

- AC-Refs: AC-0012-0009
- `ui_bearing: false` specs are excluded from prototyping execution.
- Validate must not over-fire UI evidence rules when there is no screen contract.

## BR-0012-0010: Legacy Traceability IDs

- AC-Refs: AC-0012-0010
- Existing user-story IDs and legacy test-case identifier space remain reserved.
- New wording may supersede old runtime narratives without renumbering historical coverage IDs.

## BR-0012-0017: Single Lineage

- AC-Refs: AC-0012-0020
- Exactly one prototype lineage per `/qfai-prototyping` invocation. No parallel candidate funnel.
- Cycles 0..14 (max 15) form a single serial chain `iter-00 → iter-01 → ... → iter-14` in `prototyping.json#iterations[]`.

## BR-0012-0018: Latest-Accepted Policy

- AC-Refs: AC-0012-0020
- `acceptedIterationIndex === iterations.length - 1` always.
- No best-of-history selection. One-step regression is permitted (canonical creative-leap path).

## BR-0012-0019: 4 UX Axes Ordinal Schema

- AC-Refs: AC-0012-0021, AC-0012-0022, AC-0012-0023
- Each `iter-NN/review.json` MUST contain `scores: {informationArchitecture, navigationFlow, usability, functionality}` with ordinal values in `{weak, acceptable, strong, exceptional}`.
- `critique` is a single 200..500 word string. `pivotDirective` is one of `"continue" | "refine" | "pivot"`.
- Schema violations raise `QFAI-PROT-020` / `QFAI-PROT-022` / `QFAI-PROT-023` per AC.

## BR-0012-0020: Layout-Anti-Pattern Catalog and IA Cap

- AC-Refs: AC-0012-0024, AC-0012-0025
- `layoutAntiPatternsDetected[]` entries MUST come from `lap-001..008` whitelist.
- Detection caps `informationArchitecture` at `acceptable`. Higher score raises `QFAI-PROT-021`.

## BR-0012-0021: pivotDirective Rules

- AC-Refs: AC-0012-0026, AC-0012-0027
- `pivot` ⇔ latest 3 iters each have low `informationArchitecture` (`weak | acceptable`) AND latest iter has `layoutAntiPatternsDetected.length > 0`.
- `continue` ⇔ ≥ 2 of the 4 axes strictly improved by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3) versus the prior iter.
- Otherwise: `refine`.
- Implementation lives in `computePivotDirective` (`packages/qfai/src/core/prototyping/evaluatorReview.ts`).

## BR-0012-0022: ordinalIndex Mapping

- AC-Refs: AC-0012-0027
- `ordinalIndex(weak)=0`, `ordinalIndex(acceptable)=1`, `ordinalIndex(strong)=2`, `ordinalIndex(exceptional)=3`. Code constant in `iteration.ts`.

## BR-0012-0023: Generator/Evaluator Separation

- AC-Refs: AC-0012-0020
- Generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be distinct sub-agent identities. Same-Claude generator/reviewer is forbidden (self-preference bias).

## BR-0012-0024: Stop Condition

- AC-Refs: AC-0012-0028, AC-0012-0029, AC-0012-0035

`/qfai-prototyping` stops when one of:

- All 4 UX axes (informationArchitecture / navigationFlow / usability / functionality) of the latest iter are `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0` (`stopReason: "axes-exceptional"`, exit 64)
- Latest iter `index === 14` (`stopReason: "max-iterations"`, exit 65)
- DESIGN.md sha256 mismatch on cycle ≥ 1 (`stopReason: "design-md-hash-mismatch"`, exit 2; forces re-run from cycle 0)

No other path triggers stop. LLM subjective DONE is forbidden.

## BR-0012-0025: SKILL.md Size Budget

- AC-Refs: AC-0012-0031
- `qfai-prototyping/SKILL.md ≤ 130` lines.
- `references/iteration-loop.md ≤ 80`, `generator-prompt.md ≤ 60`, `reviewer-prompt.md ≤ 100`, `handoff.md ≤ 50`, `design-md-spec.md ≤ 120`. Combined ≤ 410.

## BR-0012-0026: DESIGN.md Hash Gate

- AC-Refs: AC-0012-0034, AC-0012-0035
- Cycle 0 records `prototyping.json#designMdSha256 = sha256(DESIGN.md)` and asserts equality with `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.
- Cycle ≥ 1 fails closed with exit 2 and stderr `"DESIGN.md hash mismatch"` if the on-disk sha256 has drifted.

## BR-0012-0027: design-system Mirror

- AC-Refs: AC-0012-0036
- `.qfai/contracts/design/design-system.yaml` is generated post-loop as a deterministic byte-equivalent mirror of root `DESIGN.md` token tables (color / typography / radius / shadow). It is NOT extracted from the final iter HTML.
- Drift between mirror and DESIGN.md raises `QFAI-DCON-032` (validator owned by the qfai-validate spec).
