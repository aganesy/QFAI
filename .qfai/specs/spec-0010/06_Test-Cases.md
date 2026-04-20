# 06 Test Cases

## TC-0010-0001: 15-File Pack Existence

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0001
- Verify all 15 mandatory files exist and are non-empty in the discussion pack directory.

## TC-0010-0002: Inception Deck Mermaid Presence

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0002
- Verify `02_Inception-Deck.md` contains at least one ` ```mermaid ` fenced block.

## TC-0010-0003: Story Workshop Mermaid (HTML Mock Optional)

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0003
- Verify `03_Story-Workshop.md` contains Mermaid diagram; HTML+CSS mock section is optional and its absence does not fail validation.

## TC-0010-0004: Example Mapping 6 Perspectives

- EX-Ref: EX-0010-0003
- AC-Refs: AC-0010-0004
- Verify that Example Seeds sections cover all 6 mandatory perspectives.

## TC-0010-0005: OQ Register Zero Open Count

- EX-Ref: EX-0010-0002
- AC-Refs: AC-0010-0005
- Verify `Disposition: open` count is zero at discussion completion.

## TC-0010-0006: OQ Register Schema Validation

- EX-Ref: EX-0010-0002
- AC-Refs: AC-0010-0006
- Verify all 11 mandatory columns are present in `11_OQ-Register.md`.

## TC-0010-0007: Deferred Metadata Schema Validation

- EX-Ref: EX-0010-0002
- AC-Refs: AC-0010-0007
- Verify all 11 mandatory columns are present in `13_Deferred.md`.

## TC-0010-0008: DDP Design Direction Summary Completeness

- EX-Ref: EX-0010-0004
- AC-Refs: AC-0010-0008
- Verify all 6 DDS subsections exist in `03_Story-Workshop.md` for UI-bearing packs.

## TC-0010-0009: UI-Bearing Sidecar Canonical Family Generation

- EX-Ref: EX-0010-0004
- AC-Refs: AC-0010-0009
- Verify all canonical 3-layer family sidecar files (as listed in `00_index.md`) are generated for UI-bearing packs; no legacy 4-axis files are included.

## TC-0010-0010: Non-UI Skips Sidecar

- EX-Ref: EX-0010-0005
- AC-Refs: AC-0010-0009
- Verify no uiux/ directory is created for non-ui surface type.

## TC-0010-0011: RCP 12-Reviewer Execution

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0010
- Verify all 12 reviewers execute in the correct order (1-10, 11, 12).

## TC-0010-0012: Competitive Reference Validation

- EX-Ref: EX-0010-0004
- AC-Refs: AC-0010-0011
- Verify 3+ competitive references with non-placeholder adopted/rejected/local_translation fields.

## TC-0010-0013: Coverage Placeholder for EX-0010-0006

- EX-Ref: EX-0010-0006
- AC-Refs: AC-0010-0001
- Verify that migrated example EX-0010-0006 is covered by at least one test case.

## TC-0010-0014: Coverage Placeholder for EX-0010-0007

- EX-Ref: EX-0010-0007
- AC-Refs: AC-0010-0001
- Verify that migrated example EX-0010-0007 is covered by at least one test case.

## TC-0010-0015: Coverage Placeholder for EX-0010-0008

- EX-Ref: EX-0010-0008
- AC-Refs: AC-0010-0001
- Verify that migrated example EX-0010-0008 is covered by at least one test case.

## TC-0010-0016: Coverage Placeholder for EX-0010-0009

- EX-Ref: EX-0010-0009
- AC-Refs: AC-0010-0001
- Verify that migrated example EX-0010-0009 is covered by at least one test case.

## TC-0010-0017: Coverage Placeholder for EX-0010-0010

- EX-Ref: EX-0010-0010
- AC-Refs: AC-0010-0001
- Verify that migrated example EX-0010-0010 is covered by at least one test case.

## TC-0010-0018: SKILL.md 3-Layer Model Exclusivity

- EX-Ref: EX-0010-0011
- AC-Refs: AC-0010-0012
- Verify that the qfai-discussion SKILL.md contains the terms "invariant", "trend-derived", and "product-specific" and does not contain references to the old 4-axis model as active (usability/consistency/accessibility/delight as separate evaluation axes).

## TC-0010-0019: Init Generates 3-Layer Family Only

- EX-Ref: EX-0010-0011, EX-0010-0015
- AC-Refs: AC-0010-0013
- Verify that `qfai init` output contains no files named `20_eval_axis_usability.md`, `21_eval_axis_consistency.md`, `22_eval_axis_accessibility.md`, or `23_eval_axis_delight.md` in the active template set.

## TC-0010-0020: HTML/CSS Mock Not Blocking Completion

- EX-Ref: EX-0010-0011
- AC-Refs: AC-0010-0018, AC-0010-0003
- Verify that discussion completion validation passes when `03_Story-Workshop.md` has a Mermaid diagram but no HTML+CSS mock section.

## TC-0010-0021: 00_index.md Canonical Family Listing

- EX-Ref: EX-0010-0011
- AC-Refs: AC-0010-0014
- Verify that `00_index.md` lists only canonical 3-layer family files and contains no entries for legacy 4-axis files (20–23).

## TC-0010-0022: 10_implementation_strategy.md Strong Schema Validation

- EX-Ref: EX-0010-0011
- AC-Refs: AC-0010-0015
- Verify that `uiux/10_implementation_strategy.md` contains mandatory fields (surface classification, implementation strategy, rationale) with non-placeholder values.

## TC-0010-0023: 40_screen_contracts.md Screen-Obligation Schema

- EX-Ref: EX-0010-0011
- AC-Refs: AC-0010-0016
- Verify that each screen entry in `40_screen_contracts.md` contains screen ID, obligations list, secondary_tasks, and acceptance signals with non-placeholder values.

## TC-0010-0024: 04_Sources.md Trend Evaluation Support

- EX-Ref: EX-0010-0013
- AC-Refs: AC-0010-0017
- Verify that competitive references in `04_Sources.md` include `source_translation` fields linking research findings to trend-derived evaluation axes.

## TC-0010-0025: No 4-Axis Files in Active Generation

- EX-Ref: EX-0010-0014
- AC-Refs: AC-0010-0013
- Verify that the init template set and generated discussion packs do not include old 4-axis files in any active path (init defaults, 00_index.md manifest, validator active set).

## TC-0010-0026: Init vs Dogfood Semantic Parity

- EX-Ref: EX-0010-0015
- AC-Refs: AC-0010-0013
- Verify that `qfai init` generated uiux/ templates are semantically equivalent to the dogfood source in `packages/qfai/assets/init/`; no missing fields, no stale 4-axis references, identical canonical family.

## TC-0010-0027: Taste Interview Absence Fails Sidecar Validation

- EX-Ref: EX-0010-0012
- AC-Refs: AC-0010-0012
- Verify that a UI-bearing pack missing the design taste interview (10 sections) fails sidecar validation with `UIX-VAL-TASTE-*` errors.

## TC-0010-0028: Trend-Derived Axis Missing Source Translation Fails

- EX-Ref: EX-0010-0013
- AC-Refs: AC-0010-0017
- Verify that a UI-bearing pack where competitive references lack `source_translation` linking to trend-derived axes fails validation.

## TC-0010-0029: HTML/CSS Mock Absent Does Not Block Completion

- EX-Ref: EX-0010-0016
- AC-Refs: AC-0010-0018
- Verify that discussion completion validation passes when `03_Story-Workshop.md` has Mermaid diagrams but no HTML/CSS mock section; no error is reported for the missing mock.

## TC-0010-0030: Template File Name Matches Validator Expectation

- EX-Ref: EX-0010-0017
- AC-Refs: AC-0010-0013, AC-0010-0015, AC-0010-0016
- Verify that every template file name in `uiux/` matches the pattern expected by `UIX-VAL-*` validators; mismatches are reported as broken traceability errors.

## TC-0010-0031: Step 11.3 presence in SKILL.md with Phase A/B labels

- EX-Ref: EX-0010-0018
- AC-Refs: AC-0010-0019
- Type: unit

Verify that `/qfai-discussion` SKILL.md contains a Step 11.3 section with explicit "Phase A" (brand selection) and "Phase B" (customization) labels.

## TC-0010-0032: 12_design_system.md produced with 8 sections for UI-bearing pack

- EX-Ref: EX-0010-0018
- AC-Refs: AC-0010-0020, AC-0010-0027
- Type: integration

Verify that running `/qfai-discussion` to completion on a UI-bearing pack produces `uiux/12_design_system.md` with all 8 required sections present as ATX headings and non-empty bodies.

## TC-0010-0033: Step 11.3 skipped when surface is non-UI

- EX-Ref: EX-0010-0019
- AC-Refs: AC-0010-0019
- Type: integration

Verify that for a pack with `surface: non-ui`, `/qfai-discussion` does not invoke Step 11.3 and does not produce `uiux/12_design_system.md`; no uiux/ directory is created.

## TC-0010-0034: Archetype scoring tie-breaker is deterministic

- EX-Ref: EX-0010-0020
- AC-Refs: AC-0010-0019
- Type: unit (boundary)

Verify that when taste-interview scoring ties between two archetypes, the tie-breaker (highest visual-theme weight, then alphabetical) selects the same archetype across reruns.

## TC-0010-0035: Phase A contains no human-confirmation markers

- EX-Ref: EX-0010-0021
- AC-Refs: AC-0010-0019
- Type: unit

Verify that SKILL.md Step 11.3 Phase A content contains no human-confirmation prompts (e.g., "Please confirm", "Ask user to approve", "Wait for human") — autonomous execution per NFR-0008.

## TC-0010-0036: Phase ordering — Phase A before Phase B

- EX-Ref: EX-0010-0022
- AC-Refs: AC-0010-0019
- Type: integration

Verify that a modified SKILL.md attempting Phase B before Phase A is rejected by the SKILL.md phase-ordering validator with a clear diagnostic.

## TC-0010-0037: Idempotent Step 11.3 given identical taste interview

- EX-Ref: EX-0010-0023
- AC-Refs: AC-0010-0020
- Type: integration

Verify that running Step 11.3 twice against the same taste interview produces byte-identical `uiux/12_design_system.md`.

## TC-0010-0038: SKILL.md contains Step 11.5 with visual-axis mandate

- EX-Ref: EX-0010-0024
- AC-Refs: AC-0010-0021
- Type: unit

Verify that `/qfai-discussion` SKILL.md contains a Step 11.5 section that mandates deriving at least one visual-category TRD-XX axis for UI-bearing packs.

## TC-0010-0039: UIX-VAL-T04 emits WARNING when no visual axis derived

- EX-Ref: EX-0010-0025
- AC-Refs: AC-0010-0022
- Type: integration

Verify that on a pack with no visual axis in `21_design_eval_trend_derived.md`, `qfai validate` emits UIX-VAL-T04 with severity `warning` and exits 0 under `--fail-on error`.

## TC-0010-0040: Multiple visual categories → at least one derived axis passes

- EX-Ref: EX-0010-0026
- AC-Refs: AC-0010-0021
- Type: integration

Verify that a pack with two visual Trend Scan categories (e.g., color + typography) and one derived visual axis produces zero UIX-VAL-T04 issues.

## TC-0010-0041: 04_Sources.md template exposes evaluation_connection on all 6 categories

- EX-Ref: EX-0010-0027
- AC-Refs: AC-0010-0023
- Type: unit

Verify that `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/04_Sources.md` declares the `evaluation_connection` field on each of the 6 Trend Scan category sections (color, typography, visual motif, spacing, shape, imagery).

## TC-0010-0042: UIX-VAL-T01 fires when evaluation_connection is missing

- EX-Ref: EX-0010-0028
- AC-Refs: AC-0010-0023
- Type: integration

Verify that a UI-bearing pack whose color-category Trend Scan entry omits `evaluation_connection` causes `qfai validate --fail-on error` to exit non-zero with UIX-VAL-T01.

## TC-0010-0043: 21_design_eval_trend_derived.md template ships visual-axis examples + source_refs guidance

- EX-Ref: EX-0010-0029
- AC-Refs: AC-0010-0024
- Type: unit

Verify that the canonical template `templates/uiux/21_design_eval_trend_derived.md` contains at least two visual-axis example entries and commentary guiding authors to set `source_refs` from `04_Sources.md`.

## TC-0010-0044: Sidecar Generation Flow order — Step 1c before Step 1d, parallel forbidden

- EX-Ref: EX-0010-0030
- AC-Refs: AC-0010-0025
- Type: unit

Verify that `/qfai-discussion` SKILL.md Sidecar Generation Flow declares Step 1c before Step 1d and contains an explicit "parallel execution forbidden" marker on the dependency edge.

## TC-0010-0045: Parallel 1c/1d detection

- EX-Ref: EX-0010-0031
- AC-Refs: AC-0010-0025
- Type: integration

Verify that a SKILL.md mutation marking Step 1c and 1d parallel is flagged as a dependency violation by the SKILL.md validator.

## TC-0010-0046: design-md-brand-catalog.md contains 8 archetypes with required fields

- EX-Ref: EX-0010-0032
- AC-Refs: AC-0010-0026
- Type: unit

Verify that `references/design-md-brand-catalog.md` contains all 8 archetypes, each with `representative_brand` and `aesthetic_properties` fields populated.

## TC-0010-0047: 12_design_system.md template defines 8 sections with guidance

- EX-Ref: EX-0010-0033
- AC-Refs: AC-0010-0027
- Type: unit

Verify that `templates/uiux/12_design_system.md` declares all 8 canonical sections as ATX headings, each with non-empty guidance content.

## TC-0010-0048: UIX-VAL-T04 severity is WARNING (not ERROR) per NFR-0007

- EX-Ref: EX-0010-0034
- AC-Refs: AC-0010-0022
- Type: unit

Verify that `UIX-VAL-T04` severity constant resolves to `warning` in v1.7.16, honoring NFR-0007 staged introduction.

## TC-0010-0049: SKILL.md mandates design guideline research for UI-bearing packs

- EX-Ref: EX-0010-0035
- AC-Refs: AC-0010-0028
- Type: unit

Verify that `/qfai-discussion` SKILL.md contains explicit mandatory wording requiring design guideline research before finalizing trend-derived axes for UI-bearing runs.

## TC-0010-0050: `04_Sources.md` template defines `design_guideline_research` category

- EX-Ref: EX-0010-0035
- AC-Refs: AC-0010-0029
- Type: unit

Verify that the canonical `templates/04_Sources.md` contains a `design_guideline_research` section and each scaffolded entry includes `guideline_name`, `rule_refs`, `local_translation`, and `source_id`.

## TC-0010-0051: Non-UI discussion pack does not require guideline research

- EX-Ref: EX-0010-0036
- AC-Refs: AC-0010-0028
- Type: integration

Verify that a non-UI pack can complete without `design_guideline_research` entries and emits no guideline-research-specific validation issue.

## TC-0010-0052: Trend-derived template requires quantitative proxy in score_anchors

- EX-Ref: EX-0010-0037
- AC-Refs: AC-0010-0030
- Type: unit

Verify that `templates/uiux/21_design_eval_trend_derived.md` guidance explicitly requires quantitative proxy in `score_anchors.low/mid/high`.

## TC-0010-0053: Adjective-only anchor example is marked non-compliant

- EX-Ref: EX-0010-0038
- AC-Refs: AC-0010-0030
- Type: integration

Verify that a fixture using adjective-only `score_anchors` text is rejected by the authored rule set and linked to downstream validator warning T06.
