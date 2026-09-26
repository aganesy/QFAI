# 03 Acceptance Criteria

## AC-0008-0001: Volume Estimate Table

```gherkin
Scenario: Volume Estimate Table
  Given a spec with US/TC/CON-API declarations
  When the TestVolumeEstimator runs
  Then a signal table with Raw count, Signal, Evidence, and Notes columns is produced for E2E/API/Integration layers.

Scenario: Volume Estimate Table on the story tree
  Given the business flows and stories in scope
  When the TestVolumeEstimator runs
  Then the E2E raw count is the number of BFs in scope and the Integration/API raw count is the number of ACs in scope.
```

## AC-0008-0002: E2E Coverage Obligation

```gherkin
Scenario: E2E Coverage Obligation
  Given required US declarations in a spec
  When ATDD E2E implementer runs
  Then every required US has a corresponding E2E test file under `tests/e2e/**` with `QFAI:SPEC-XXXX:US-YYYY` annotation.

Scenario: E2E Coverage Obligation on the story tree
  Given a BF in scope
  When the ATDD E2E implementer runs
  Then the BF has an E2E test file under `<testsDir>/e2e/**` carrying `QFAI:BF-NNNN`.
```

## AC-0008-0003: API Coverage Obligation

```gherkin
Scenario: API Coverage Obligation
  Given required CON-API declarations
  When ATDD API implementer runs
  Then every required CON-API has a corresponding API test file under `tests/api/**` with `QFAI:CON-API-XXXX` annotation and zero TC annotations.
```

## AC-0008-0004: Integration Coverage Obligation

```gherkin
Scenario: Integration Coverage Obligation
  Given required TC declarations in a spec
  When ATDD Integration implementer runs
  Then every required TC has a corresponding Integration test file under `tests/integration/**` with `QFAI:SPEC-XXXX:TC-YYYY` annotation.

Scenario: Integration Coverage Obligation on the story tree
  Given the ACs of the stories in scope
  When the ATDD Integration implementer runs
  Then every AC has a test file under `<testsDir>/integration/**` or `<testsDir>/api/**` carrying `QFAI:AC-NNNN-NNNN-NN`.
```

## AC-0008-0005: Forbidden Reference Enforcement

```gherkin
Scenario: Forbidden Reference Enforcement
  Given generated E2E and API test files
  When the Reviewer checks them
  Then zero `QFAI:SPEC-XXXX:TC-YYYY` annotations exist in `tests/e2e/**` or `tests/api/**`.
```

## AC-0008-0006: Stage Gate Enforcement

```gherkin
Scenario: Stage Gate Enforcement
  Given the ATDD workflow
  When all stage gates P0-P8 are evaluated
  Then no gate is skipped and each gate produces a PASS/FAIL result with evidence.
```

## AC-0008-0007: Evidence File Completeness

```gherkin
Scenario: Evidence File Completeness
  Given ATDD completion
  When the evidence file is checked
  Then it contains all required sections: Objective, Inputs, Decisions, Work performed, Commands, Volume estimate, Coverage checklist, Work Orders, Execution logs, Gaps, Final status.
```

## AC-0008-0008: Reviewer Independence

```gherkin
Scenario: Reviewer Independence
  Given the ATDD workflow
  When the Reviewer gate runs
  Then the Reviewer is a different agent than the test implementers and returns only PASS or REVISE.
```

## AC-0008-0009: Coverage Depth Matrix Verification

```gherkin
Scenario: Coverage Depth Matrix Verification
  Given test cases produced by ATDD
  When the test-design-analyst reviews them
  Then a Coverage Depth Matrix is produced for each spec showing normal/error/boundary/special/state-transition/combinatorial coverage per US/TC, and any US/TC with only normal-path test cases is flagged as incomplete.

Scenario: Coverage Depth Matrix Verification on the story tree
  Given the test cases produced by ATDD for a business flow
  When the test-design-analyst reviews them
  Then the matrix shows coverage per BF and AC, and a BF or AC with only normal-path test cases is flagged as incomplete. One matrix and one ATDD evidence file are produced for each business flow instead of each spec, and the matrix rows are keyed by the flow's US, AC and EX IDs.
```

## AC-0008-0010: ATDD Scaffold Emits Per-TC Skeletons

```gherkin
Scenario: ATDD Scaffold Emits Per-TC Skeletons
  Given a spec `spec-NNNN` with declared test*cases
  When `qfai atdd scaffold --spec spec-NNNN` runs against a directory with no pre-existing skeletons
  Then for every TC a file `tests/atdd/spec-NNNN/<TC-ID>.test.*`is emitted that imports test-framework primitives, contains`// TODO: implement assertion for <TC-ID>`, and includes comment references to the related US-* / CON-API-\_; and `qfai validate`emits`D-SCAFFOLD-PLACEHOLDER` (severity warning) for each file whose TODO marker is still present.

Scenario: ATDD Scaffold Emits Per-TC Skeletons on the story tree
  Given a story `US-NNNN-NNNN` with its ACs
  When `qfai atdd scaffold --story US-NNNN-NNNN` runs with no pre-existing skeletons
  Then for every AC of the story a file `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>` is written carrying `QFAI:AC-NNNN-NNNN-NN`, and `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning), keyed by the AC ID, for each file whose placeholder is still present.

Scenario: ATDD Scaffold Emits Per-TC Skeletons on invalid story-tree input
  Given neither or both of `--story` and `--flow` are given, an ID is malformed, or an ID names nothing the tree defines
  When `qfai atdd scaffold` runs
  Then the command exits 2 and writes nothing, and `--spec` exits 2 with a message naming `--story` and `--flow`.
```

## AC-0008-0011: ATDD Scaffold Idempotency and Escalation

```gherkin
Scenario: ATDD Scaffold Idempotency and Escalation — idempotency
  Given a story or flow skeleton whose TODO marker has been replaced with a real assertion
  When `qfai atdd scaffold --story US-NNNN-NNNN` or `--flow BF-NNNN` is re-run for that scope
  Then the existing file is not overwritten and no new file is written

Scenario: ATDD Scaffold Idempotency and Escalation — escalation
  Given an AC or BF skeleton whose placeholder remains unremoved across 3 `qfai validate` cycles (the `atdd.scaffoldEscalateCycles` default per DR-0272)
  When the 3rd validation cycle runs
  Then `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error for that AC or BF ID (configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`).
```

## AC-0008-0012: Seven Credential-Reuse Rules and the Companion Rule Are Stated

```gherkin
Scenario: Seven Credential-Reuse Rules and the Companion Rule Are Stated
  Given the `/qfai-atdd` credential-reuse guidance artifact
  When it is read
  Then it states all seven rules as distinct statements — never sign in per test; never share one account across parallel workers; key the cached session by the pair of worker index and actor; tear the cache down at worker exit; re-authenticate and rewrite the cache when a restored session is rejected; a test that mutates its own account creates a dedicated one; test-level parallelism costs more workers, not more sign-ins — and it states the companion rule that an environment identifier injected by the caller forbids the harness from provisioning or tearing down that environment; and the skill entry point cross-links the artifact.
```

## AC-0008-0013: Guidance Is Backend-Agnostic and Grows No Vocabulary

```gherkin
Scenario: Guidance Is Backend-Agnostic and Grows No Vocabulary
  Given the credential-reuse guidance artifact
  When it is scanned
  Then it names no browser backend, contains no install command and no version pin, and presents any worked example as one illustration among possible backends; and it introduces no validator, no finding code, no new test layer and no new annotation token, so the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline.
```

## AC-0008-0014: Script-Naming Rule Is Adopter Guidance, Scoped to ATDD Layers

```gherkin
Scenario: Script-Naming Rule Is Adopter Guidance, Scoped to ATDD Layers
  Given the credential-reuse guidance artifact
  When its scope statement is read
  Then the credential-class script-naming rule — a credential-free lane and a credentialed lane MUST be reachable by different script names — appears as adopter guidance only, the artifact states that QFAI keeps its own script names and that QFAI's own suite has zero credentials so none of this is dogfooded here, and the guidance obliges the E2E / API / Integration layers only, introducing no unit or component obligation (RJ-0008-0001).
```

## AC-0008-0015: ATDD Scaffold Emits a Business-Flow Skeleton

```gherkin
Scenario: ATDD Scaffold Emits a Business-Flow Skeleton
  Given a project on the story tree and a business flow `BF-NNNN` it defines
  When `qfai atdd scaffold --flow BF-NNNN` runs with no pre-existing skeleton for that flow
  Then one file `<testsDir>/e2e/<BF-ID>.test.<ext>` is written carrying `QFAI:BF-NNNN`; `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning), keyed by the BF ID, while its placeholder is still present; and a second run writes nothing.
```

## AC-0008-0016: Scoped Completion Gate Runs Per Business Flow

```gherkin
Scenario: Scoped Completion Gate Runs Per Business Flow
  Given a project on the story tree
  When `/qfai-atdd` reaches its completion gate
  Then it runs `qfai validate --profile atdd --fail-on error --flow BF-NNNN` for the flow the invocation owns, and it runs no `--spec` validation.
```
