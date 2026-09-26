# 06 Test Cases

## TC-0008-0001: Volume Estimate Produces Signal Table

- EX-Ref: EX-0008-0001
- AC-Refs: AC-0008-0001
- Verify that TestVolumeEstimator produces a table with E2E/API/Integration rows containing Raw count, Signal, Evidence, and Notes columns.

## TC-0008-0002: E2E Tests Cover All Required US

- EX-Ref: EX-0008-0002
- AC-Refs: AC-0008-0002
- Verify that every required US declared in the spec has a corresponding E2E test with the correct annotation.

## TC-0008-0003: API Tests Cover All Required CON-API

- EX-Ref: EX-0008-0004
- AC-Refs: AC-0008-0003
- Verify that every required CON-API has a corresponding API test with annotation and zero TC references.

## TC-0008-0004: Integration Tests Cover All Required TC

- EX-Ref: EX-0008-0002
- AC-Refs: AC-0008-0004
- Verify that every required TC has a corresponding Integration test with the correct annotation.

## TC-0008-0005: Forbidden TC Annotations Detected

- EX-Ref: EX-0008-0003
- AC-Refs: AC-0008-0005
- Verify that TC annotations in E2E and API test files are detected and reported as errors.

## TC-0008-0006: Stage Gates Not Skipped

- EX-Ref: EX-0008-0005
- AC-Refs: AC-0008-0006
- Verify that all stage gates P0-P8 are evaluated in order and produce evidence.

## TC-0008-0007: Evidence File Contains Required Sections

- EX-Ref: EX-0008-0001
- AC-Refs: AC-0008-0007
- Verify that the evidence file includes all mandatory sections.

## TC-0008-0008: Reviewer Independence Enforced

- EX-Ref: EX-0008-0005
- AC-Refs: AC-0008-0008
- Verify that the Reviewer is a separate agent from implementers and returns only PASS or REVISE.

## TC-0008-0009: Coverage Placeholder for EX-0008-0006

- EX-Ref: EX-0008-0006
- AC-Refs: AC-0008-0001
- Verify that migrated example EX-0008-0006 is covered by at least one test case.

## TC-0008-0010: Coverage Placeholder for EX-0008-0007

- EX-Ref: EX-0008-0007
- AC-Refs: AC-0008-0001
- Verify that migrated example EX-0008-0007 is covered by at least one test case.

## TC-0008-0011: Coverage Depth Matrix Produced and Verified

- EX-Ref: EX-0008-0008
- AC-Refs: AC-0008-0009
- Type: normal
- Verify that the test-design-analyst produces a Coverage Depth Matrix with columns for normal/error/boundary/special/state-transition/combinatorial per US/TC.

## TC-0008-0012: Normal-Path-Only Flagged as Incomplete

- EX-Ref: EX-0008-0008
- AC-Refs: AC-0008-0009
- Type: error
- Verify that a US/TC with only normal-path test cases is flagged as incomplete in the Coverage Depth Matrix and triggers REVISE.

## TC-0008-0013: Scaffold Emits Per-TC Skeleton with TODO and Refs

- EX-Ref: EX-0008-0009
- AC-Refs: AC-0008-0010
- Type: normal
- Verify that `qfai atdd scaffold --spec spec-NNNN` against an empty target dir emits `tests/atdd/spec-NNNN/<TC-ID>.test.*` per TC, each importing the test framework, containing `// TODO: implement assertion for <TC-ID>`, and referencing related `US-*` / `CON-API-*` in comments; and that `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (warning) for each unfilled file.

## TC-0008-0014: Scaffold Idempotency and 3-Cycle Escalation

- EX-Ref: EX-0008-0010
- AC-Refs: AC-0008-0011
- Type: error
- Verify that re-running `--story` or `--flow` does not overwrite a filled or unfilled AC or BF skeleton, and that a placeholder retained across three `qfai validate` cycles (default `atdd.scaffoldEscalateCycles: 3` per DR-0272) escalates `D-SCAFFOLD-PLACEHOLDER` for its AC or BF ID from warning to error on the third cycle.

## TC-0008-0015: Seven Rules and Companion Rule Stated and Linked

- EX-Ref: EX-0008-0011
- AC-Refs: AC-0008-0012
- Type: normal
- Level: integration
- Verify that the `/qfai-atdd` credential-reuse guidance artifact states all seven session-reuse rules as distinct statements plus the companion caller-injected-environment rule, and that the skill entry point cross-links the artifact.

## TC-0008-0016: Guidance Names No Browser Backend

- EX-Ref: EX-0008-0012
- AC-Refs: AC-0008-0013
- Type: error
- Level: integration
- Verify that a deny-list scan of the guidance artifact for browser-backend names, install commands and version pins returns zero matches, and that the same scan reports a non-zero count against a fixture with a planted backend name — so a green result is a checked result rather than a vacuous one.

## TC-0008-0017: Guidance Adds No Layer, Token, Finding Code or Validator

- EX-Ref: EX-0008-0012
- AC-Refs: AC-0008-0013
- Type: boundary
- Level: integration
- Verify that with the guidance artifact present the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline, and that the artifact itself contains no `QFAI:`-form annotation token, no finding code and no new layer heading.

## TC-0008-0018: Script-Naming Rule Is Adopter-Only and Excludes Unit/Component

- EX-Ref: EX-0008-0013
- AC-Refs: AC-0008-0014
- Type: boundary
- Level: integration
- Verify that the guidance records the credential-class script-naming rule as adopter guidance, states that QFAI keeps its own script names and that its own suite has zero credentials, and that its scope statement obliges E2E / API / Integration only with no unit or component obligation.

## TC-0008-0019: Scaffold Rejects a Missing, Doubled or Unresolvable Option

- EX-Ref: EX-0008-0014
- AC-Refs: AC-0008-0010
- Type: error
- Level: integration
- Verify that on the story tree `qfai atdd scaffold` exits 2 and writes no file when it is given neither `--story` nor `--flow`, both of them, a malformed ID, or a well-formed ID the tree does not define, and that `--spec spec-NNNN` alone is rejected by the same no-option check with a message naming `--story` and `--flow`.

## TC-0008-0020: Scaffold Emits One Flow Skeleton and a Rerun Writes Nothing

- EX-Ref: EX-0008-0015
- AC-Refs: AC-0008-0015
- Type: normal
- Level: integration
- Verify that on the story tree `qfai atdd scaffold --flow BF-NNNN` writes exactly one `<testsDir>/e2e/<BF-ID>.test.<ext>` carrying `QFAI:BF-NNNN`, that `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (warning) keyed by the BF ID while the placeholder remains, and that a second run writes nothing and leaves the file unchanged.

## TC-0008-0021: The ATDD Completion Gate Is Scoped by Flow

- EX-Ref: EX-0008-0016
- AC-Refs: AC-0008-0016
- Type: normal
- Level: integration
- Verify that the `qfai-atdd` skill's `SKILL.md` states, for a project on the story tree, the completion gate `qfai validate --profile atdd --fail-on error --flow BF-NNNN` scoped to the flow the invocation owns, and names no `--spec` validation for that tree.

## TC-0008-0022: An Annotation Naming an Undefined ID Is an Error

- EX-Ref: EX-0008-0017
- AC-Refs: AC-0008-0002, AC-0008-0004
- Type: error
- Level: integration
- Verify that on the story tree a `QFAI:BF-…`, `QFAI:AC-…` or `QFAI:EX-…` annotation naming an ID the tree does not define is reported as an error naming the file and the ID, and that an annotation naming a defined ID raises no such finding.

## TC-0008-0023: The Coverage Depth Matrix and ATDD Evidence Are Keyed by Business Flow

- EX-Ref: EX-0008-0018
- AC-Refs: AC-0008-0009
- Type: normal
- Level: integration
- Verify that the `qfai-atdd` skill and the `test-design-analyst` card state, for a project on the story tree, one Coverage Depth Matrix at `.qfai/evidence/coverage-depth-<BF-ID>.md` and one ATDD evidence file at `.qfai/evidence/atdd-<BF-ID>.md` for each business flow, with the matrix rows keyed by the flow's US, AC and EX IDs, and that neither names a per-spec file for that tree.
