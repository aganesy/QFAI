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

## TC-0010-0022: 10_strategy.md Strong Schema Validation

- EX-Ref: EX-0010-0011
- AC-Refs: AC-0010-0015
- Verify that `10_strategy.md` contains mandatory fields (surface classification, implementation strategy, rationale) with non-placeholder values.

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
