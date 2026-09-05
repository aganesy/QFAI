# 03 Acceptance Criteria

## AC-0010-0001

Given a UI-bearing discussion pack, when sidecar generation completes, then `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`, `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `40_screen_contracts.md`, and `50_review_input_bundle.md` exist.

## AC-0010-0002

Given `30_exploration_brief.md`, when validated, then it contains Product Intent, Must-preserve Interactions, Brand Signals, and Differentiation Targets.

## AC-0010-0003

Given `33_exploration_rubric.md`, when validated, then it contains Design Quality, Originality, Craft, and Functionality.

## AC-0010-0004

Given `34_evaluator_calibration.md`, when validated, then it contains Good Critique, Too Lenient, Blandness Fail, and Originality Fail.

## AC-0010-0005

Given `50_review_input_bundle.md`, when validated, then it documents best-of-history handling.

## AC-0010-0006

Given a UI-bearing discussion pack, when inspected, then it does not declare a final winner direction or finalized design system.

## AC-0010-0007: DESIGN.md draft as discussion phase output

- Given a `/qfai-discussion` UI-bearing run completes,
- When the discussion pack is finalized,
- Then root `DESIGN.md` exists at the consuming-project root with required token tables (color / typography / radius / shadow) parseable per the design-md reference under the active design contracts of this spec's discussion deliverables.

## AC-0010-0008: legacy sidecars not emitted

- Given a fresh `/qfai-discussion` UI-bearing run,
- When the produced sidecars are listed,
- Then `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md` are NOT created. Producing them is a regression and triggers the skill validator under this spec.

## AC-0010-0009: Mock template default + strict validator (anchor-form)

- US-Refs: US-0010-0011
- Given the shipped `qfai-discussion` mock template and SKILL.md authoring guidance,
- When an HTML mock is authored in `03_Story-Workshop.md`,
- Then the template-emitted links are anchor-form (`<a href="#<name>">`) and SKILL.md instructs anchor-form authoring; `QFAI-MOCK-010` continues to PASS anchor hrefs (`#name`) and external `http(s)://` hrefs, and same-origin absolute hrefs (`/path/`) are NOT emitted by the template.

## AC-0010-0010: Mock template ↔ validator SSOT-sync (`R-MOCK-HREF-DRIFT`)

- US-Refs: US-0010-0011
- Given the template ↔ `QFAI-MOCK-010` validator SSOT-sync pair (Pair V),
- When one side is edited without the matching update to the other,
- Then the Reviewer-Gate finding `R-MOCK-HREF-DRIFT` (severity error) fires naming the asymmetric edit.

## AC-0010-0011: `/qfai-discussion` writes the active session pointer

- US-Refs: US-0010-0012
- Given a `/qfai-discussion` run finalizing a pack,
- When the pack is finalized,
- Then `.qfai/state.json#discussion.currentId` is set to the just-authored pack ID (the single SSOT for the active session); `qfai discussion list --active` reads this value rather than inferring from filesystem timestamps.

## AC-0010-0012: Multiple-active ambiguity rejected with recovery guidance

- US-Refs: US-0010-0012
- Given `.qfai/state.json#discussion.currentId` is absent OR resolves to a missing/duplicate pack,
- When the active pointer is resolved,
- Then an error is raised naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`); the active session is NOT inferred from mtime.
