# 05 Examples

## EX-0010-0001: Complete 15-File Pack

- BR-Ref: BR-0010-0001
- Given a discussion run for a web application
- When discussion completes
- Then `.qfai/discussion/discussion-20260401120000000/` contains all 15 files (01..14, 99)

## EX-0010-0002: OQ Resolution to Zero

- BR-Ref: BR-0010-0002
- Given 3 OQs identified during interview, 2 resolved and 1 deferred
- When deferred OQ has complete metadata in `13_Deferred.md`
- Then open count is zero and discussion can complete

## EX-0010-0003: Example Mapping Perspectives

- BR-Ref: BR-0010-0002
- Given BR-0010-0001 (Fixed Output Path)
- When Example Mapping runs with 6 perspectives
- Then happy path, negative path, edge/boundary, permission/role, state transition, and idempotency are each addressed or skipped with reason

## EX-0010-0004: UI-Bearing Sidecar Generation

- BR-Ref: BR-0010-0004
- Given surface type `web-ui` detected
- When discussion completes
- Then all 11 uiux/ files are generated including strategy, scoring axes, anchor, and contracts

## EX-0010-0005: Non-UI Pack Skips Sidecar

- BR-Ref: BR-0010-0004
- Given surface type `non-ui` (CLI tool)
- When discussion completes
- Then no uiux/ directory is created and no DDS validators fire

## EX-0010-0006: Coverage Placeholder for BR-0010-0003

- BR-Ref: BR-0010-0003
- Given the consolidated rule BR-0010-0003
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0003

## EX-0010-0007: Coverage Placeholder for BR-0010-0005

- BR-Ref: BR-0010-0005
- Given the consolidated rule BR-0010-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0005

## EX-0010-0008: Coverage Placeholder for BR-0010-0006

- BR-Ref: BR-0010-0006
- Given the consolidated rule BR-0010-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0006

## EX-0010-0009: Coverage Placeholder for BR-0010-0007

- BR-Ref: BR-0010-0007
- Given the consolidated rule BR-0010-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0007

## EX-0010-0010: Coverage Placeholder for BR-0010-0008

- BR-Ref: BR-0010-0008
- Given the consolidated rule BR-0010-0008
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0008

## EX-0010-0011: UI-Bearing Pack with 3-Layer Sidecar (Happy Path)

- BR-Ref: BR-0010-0009, BR-0010-0010
- Given a UI-bearing project (`web-ui`) with discussion completed under v1.7.12
- When sidecar is generated
- Then `00_index.md` lists only canonical 3-layer family files, `10_strategy.md` has surface classification + strategy + rationale, `40_contracts.md` has screen-obligation entries, and no 4-axis files (20–23) exist

## EX-0010-0012: Pack Missing Taste Interview (Fail)

- BR-Ref: BR-0010-0009
- Given a UI-bearing project with discussion completed
- When the design taste interview (10 sections) is absent or incomplete
- Then sidecar validation fails with `UIX-VAL-TASTE-*` errors because trend-derived and product-specific axes lack foundation data

## EX-0010-0013: Pack Missing Trend-Derived Evaluation (Fail)

- BR-Ref: BR-0010-0009
- Given a UI-bearing project with discussion completed
- When `04_Sources.md` has competitive references but no `source_translation` linking findings to trend-derived axes
- Then sidecar validation fails because trend-derived layer has no traceable evaluation criteria

## EX-0010-0014: Non-UI Pack Skips 3-Layer Sidecar Without Errors

- BR-Ref: BR-0010-0009
- Given surface type `non-ui` (CLI tool, library, API-only)
- When discussion completes under v1.7.12
- Then no `uiux/` directory is created, no 3-layer validators fire, and no 4-axis validators fire

## EX-0010-0015: Init Copy vs Dogfood Copy Parity Check

- BR-Ref: BR-0010-0010
- Given `qfai init` generates a fresh project
- When the generated uiux/ templates are compared to `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/`
- Then every canonical template file is semantically equivalent (no missing fields, no stale 4-axis references)

## EX-0010-0016: HTML/CSS Mock Absent Does Not Block Completion

- BR-Ref: BR-0010-0011
- Given a UI-bearing discussion pack where `03_Story-Workshop.md` contains Mermaid diagrams but no HTML/CSS mock section
- When discussion completion validation runs
- Then no error is reported for the missing HTML/CSS mock; validation passes for this check

## EX-0010-0017: Template File Name Matches Validator Expectation

- BR-Ref: BR-0010-0012
- Given a `uiux/` sidecar directory with template files
- When file names are validated against `UIX-VAL-*` validator patterns
- Then every template file name matches the expected pattern; mismatches are reported as broken traceability errors
