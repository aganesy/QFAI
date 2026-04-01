# 06 Test Cases

## TC-0010-0001: 15-File Pack Existence

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0001
- Verify all 15 mandatory files exist and are non-empty in the discussion pack directory.

## TC-0010-0002: Inception Deck Mermaid Presence

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0002
- Verify `02_Inception-Deck.md` contains at least one ` ```mermaid ` fenced block.

## TC-0010-0003: Story Workshop Mermaid and HTML Mock

- EX-Ref: EX-0010-0001
- AC-Refs: AC-0010-0003
- Verify `03_Story-Workshop.md` contains Mermaid diagram and HTML+CSS mock for UI stories.

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

## TC-0010-0009: UI-Bearing Sidecar 11-File Generation

- EX-Ref: EX-0010-0004
- AC-Refs: AC-0010-0009
- Verify all 11 uiux/ sidecar files are generated for UI-bearing packs.

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
