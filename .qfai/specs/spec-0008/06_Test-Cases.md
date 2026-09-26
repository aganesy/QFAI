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
- Verify that re-running scaffold does NOT overwrite a skeleton whose TODO was replaced with a real assertion (idempotent boundary), and that a skeleton retaining its `// TODO: implement assertion for <TC-ID>` marker across 3 `qfai validate` cycles (default `atdd.scaffoldEscalateCycles: 3` per DR-0272) escalates `D-SCAFFOLD-PLACEHOLDER` from warning to error on the 3rd cycle.

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

## TC-0008-0019: The ATDD Stage Follows the Stage-Skill Handover

- EX-Ref: EX-0008-0014
- AC-Refs: AC-0008-0015
- Type: normal
- Level: L3
- Verify, by reading the shipped `qfai-atdd/SKILL.md` and `qfai-atdd/references/orchestrated-mode.md`, that `SKILL.md` holds exactly one line citing `references/orchestrated-mode.md`, and that the reference states the entry check: in mode `active`, a request with no work order and no name is passed to `qfai-run` with nothing edited, and a worker checks the run, stage instance and work-order IDs and does only that work order's work.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/stageSkillHandover.test.ts`. The mismatched-work-order refusal is the shared stage-skill rule's case and is not repeated here.

## TC-0008-0020: The Operations Table Lists Exactly the ATDD Operations

- EX-Ref: EX-0008-0015
- AC-Refs: AC-0008-0016
- Type: normal
- Level: L3
- Verify that `qfai-atdd/references/orchestrated-mode.md` has a heading exactly `## Operations`, that the first table under it has a first column headed `Operation`, and that the set of backticked IDs in that column equals the literal set `author-acceptance-tests`, `test-fix` the test holds.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/operationsTable.test.ts`. Whether the shipped plans load against this table is the workflow core's test and is not asserted.

## TC-0008-0021: A Non-Assertion Failure Is Never Reported as RED

- EX-Ref: EX-0008-0016
- AC-Refs: AC-0008-0017
- Type: error
- Level: L3
- Verify that the reference pairs failure kind `assertion` with `expected_red`, and pairs each of `collection`, `import`, `startup` and `timeout` with `unrun` or `blocked` and never with `expected_red`. The five kinds are held literally in the test, and it fails when a kind is missing or a non-assertion kind is paired with `expected_red`.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/redAtAssertion.test.ts`. The core's refusal of such a result at `accept` is not this case's.

## TC-0008-0022: A Pass With Cross-Spec Obligations Is Accepted With Debt

- EX-Ref: EX-0008-0017
- AC-Refs: AC-0008-0018
- Type: normal
- Level: L3
- Verify that the reference maps `PASS with cross-spec obligations` to outcome `accepted_with_debt` with one `debts` entry per obligation naming its owning spec and its resolving owner, and states that a finding with no named owner is not handed on as a debt.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/crossSpecDebts.test.ts`.

## TC-0008-0023: The Seam Round Trip Returns to the Same Stage Instance

- EX-Ref: EX-0008-0018
- AC-Refs: AC-0008-0019
- Type: normal
- Level: L3
- Verify that the reference states, in this order: a test that cannot reach its assertion for want of a route, export or module is returned `needs_repair` with a seam request naming that test; after the seam-only result is accepted, the same acceptance stage instance runs as a new attempt and takes RED at the assertion; only then is the full implementation handed on. Verify also that it states no second run starts and cites the existing `references/red-provenance.md`.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/seamRoundTrip.test.ts`. A seam-only result that observes `pass` is refused by the core, which is not this case's.

## TC-0008-0024: The Layer Decision Is Made From the Current Spec and Ledger

- EX-Ref: EX-0008-0019
- AC-Refs: AC-0008-0020
- Type: normal
- Level: L3
- Verify that the reference limits reuse of the shared preflight snapshot to the inputs the snapshot covers, and states that the layer each obligation needs is decided from the current spec and ledger at every stage start and never taken from the snapshot.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/layerDecisionNotCached.test.ts`.

## TC-0008-0025: A Test Fix Leaves the Ledger Row's Status Alone

- EX-Ref: EX-0008-0020
- AC-Refs: AC-0008-0021
- Type: normal
- Level: L3
- Verify that the reference's `test-fix` passage states that the result names the AC or BR cited before and after the fix, with an independent review and a re-run; names `Status`, `TC-Refs`, `Layer` and `Boundary` as cells the fix does not edit, and `Test file` and `Selector` as cells it may change; and appends the re-run to the row's evidence section as a new round carrying its own `Revision`, the form the ledger validator already reads. The test fails when `Status` is among the cells the fix may change, or when the round is not required.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts`.

## TC-0008-0026: A Change of Meaning Is Routed to SDD

- EX-Ref: EX-0008-0021
- AC-Refs: AC-0008-0022
- Type: error
- Level: L3
- Verify that the reference states that a test fix after which the expectation would cite a different AC or BR returns `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its resolving owner, and that no accepted test fix is returned for it.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts`. The core's refusal of a result whose cited AC or BR changed is not this case's.

## TC-0008-0027: ATDD Takes a Test Fix Only for an Acceptance-Layer Row

- EX-Ref: EX-0008-0022
- AC-Refs: AC-0008-0023
- Type: boundary
- Level: L3
- Verify that the reference assigns `test-fix` to `/qfai-atdd` for an `E2E` row, an `API` row and an `Integration` row with at least one test case at a level other than `L1` or `L2`, and to none of a `Unit` row, a `Component` row or an `Integration` row whose test cases are all `L1` or `L2`. The boundary is the `Integration` row: one `L3` test case among `L1` and `L2` cases makes it ATDD's.
- Notes: test module `packages/qfai/tests/integration/atdd/orchestrated/testFixLayers.test.ts`. The unit-layer half of the assignment is `/qfai-implement`'s and is not asserted here.
