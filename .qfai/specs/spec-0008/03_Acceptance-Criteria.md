# 03 Acceptance Criteria

## AC-0008-0001: Volume Estimate Table

Given a spec with US/TC/CON-API declarations, when the TestVolumeEstimator runs, then a signal table with Raw count, Signal, Evidence, and Notes columns is produced for E2E/API/Integration layers.

## AC-0008-0002: E2E Coverage Obligation

Given required US declarations in a spec, when ATDD E2E implementer runs, then every required US has a corresponding E2E test file under `tests/e2e/**` with `QFAI:SPEC-XXXX:US-YYYY` annotation.

## AC-0008-0003: API Coverage Obligation

Given required CON-API declarations, when ATDD API implementer runs, then every required CON-API has a corresponding API test file under `tests/api/**` with `QFAI:CON-API-XXXX` annotation and zero TC annotations.

## AC-0008-0004: Integration Coverage Obligation

Given required TC declarations in a spec, when ATDD Integration implementer runs, then every required TC has a corresponding Integration test file under `tests/integration/**` with `QFAI:SPEC-XXXX:TC-YYYY` annotation.

## AC-0008-0005: Forbidden Reference Enforcement

Given generated E2E and API test files, when the Reviewer checks them, then zero `QFAI:SPEC-XXXX:TC-YYYY` annotations exist in `tests/e2e/**` or `tests/api/**`.

## AC-0008-0006: Stage Gate Enforcement

Given the ATDD workflow, when all stage gates P0-P8 are evaluated, then no gate is skipped and each gate produces a PASS/FAIL result with evidence.

## AC-0008-0007: Evidence File Completeness

Given ATDD completion, when the evidence file is checked, then it contains all required sections: Objective, Inputs, Decisions, Work performed, Commands, Volume estimate, Coverage checklist, Work Orders, Execution logs, Gaps, Final status.

## AC-0008-0008: Reviewer Independence

Given the ATDD workflow, when the Reviewer gate runs, then the Reviewer is a different agent than the test implementers and returns only PASS or REVISE.

## AC-0008-0009: Coverage Depth Matrix Verification

Given test cases produced by ATDD, when the test-design-analyst reviews them, then a Coverage Depth Matrix is produced for each spec showing normal/error/boundary/special/state-transition/combinatorial coverage per US/TC, and any US/TC with only normal-path test cases is flagged as incomplete.

## AC-0008-0010: ATDD Scaffold Emits Per-TC Skeletons

Given a spec `spec-NNNN` with declared test*cases, when `qfai atdd scaffold --spec spec-NNNN` runs against a directory with no pre-existing skeletons, then for every TC a file `tests/atdd/spec-NNNN/<TC-ID>.test.*`is emitted that imports test-framework primitives, contains`// TODO: implement assertion for <TC-ID>`, and includes comment references to the related US-* / CON-API-\_; and `qfai validate`emits`D-SCAFFOLD-PLACEHOLDER` (severity warning) for each file whose TODO marker is still present.

## AC-0008-0011: ATDD Scaffold Idempotency and Escalation

Given a `tests/atdd/spec-NNNN/<TC-ID>.test.*` file whose TODO marker has been replaced with a real assertion, when `qfai atdd scaffold --spec spec-NNNN` is re-run, then the non-TODO content is NOT overwritten (idempotent); and given a skeleton whose `// TODO: implement assertion for <TC-ID>` remains unremoved across 3 `qfai validate` cycles (the `atdd.scaffoldEscalateCycles` default per DR-0272), then `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error on the 3rd cycle (configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`).

## AC-0008-0012: Seven Credential-Reuse Rules and the Companion Rule Are Stated

Given the `/qfai-atdd` credential-reuse guidance artifact, when it is read, then it states all seven rules as distinct statements — never sign in per test; never share one account across parallel workers; key the cached session by the pair of worker index and actor; tear the cache down at worker exit; re-authenticate and rewrite the cache when a restored session is rejected; a test that mutates its own account creates a dedicated one; test-level parallelism costs more workers, not more sign-ins — and it states the companion rule that an environment identifier injected by the caller forbids the harness from provisioning or tearing down that environment; and the skill entry point cross-links the artifact.

## AC-0008-0013: Guidance Is Backend-Agnostic and Grows No Vocabulary

Given the credential-reuse guidance artifact, when it is scanned, then it names no browser backend, contains no install command and no version pin, and presents any worked example as one illustration among possible backends; and it introduces no validator, no finding code, no new test layer and no new annotation token, so the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline.

## AC-0008-0014: Script-Naming Rule Is Adopter Guidance, Scoped to ATDD Layers

Given the credential-reuse guidance artifact, when its scope statement is read, then the credential-class script-naming rule — a credential-free lane and a credentialed lane MUST be reachable by different script names — appears as adopter guidance only, the artifact states that QFAI keeps its own script names and that QFAI's own suite has zero credentials so none of this is dogfooded here, and the guidance obliges the E2E / API / Integration layers only, introducing no unit or component obligation (RJ-0008-0001).

## AC-0008-0015: The ATDD stage follows the stage-skill handover

- US-Refs: US-0008-0009

```gherkin
# AC-0008-0015
# Source: discussion-20260923171450572#REQ-0051
Scenario: The ATDD stage follows the stage-skill handover
  Given workflow mode active
  When /qfai-atdd is selected with no work order and not by name
  Then it edits nothing and passes the request to qfai-run
  And a worker handed a work order checks the run, stage and work-order IDs and does only that work
  And SKILL.md cites references/orchestrated-mode.md with one line
```

## AC-0008-0016: The Operations table lists what the plan vocabulary assigns to qfai-atdd

- US-Refs: US-0008-0009

```gherkin
# AC-0008-0016
# Source: discussion-20260923171450572#REQ-0052
Scenario: The Operations table lists what the plan vocabulary assigns to qfai-atdd
  Given the qfai-atdd reference references/orchestrated-mode.md
  When its Operations table is read
  Then it lists exactly the operations the plan vocabulary assigns to qfai-atdd
```

## AC-0008-0017: Only a failure at the intended assertion is reported as RED

- US-Refs: US-0008-0009

```gherkin
# AC-0008-0017
# Source: discussion-20260923171450572#REQ-0035
Scenario: Only a failure at the intended assertion is reported as RED
  Given an acceptance test written for the work order
  When the test fails at its intended assertion
  Then the stage result is accepted with the test observation expected_red and the failure kind assertion
  And a collection, import, start-up or timeout failure is reported unrun or blocked, never expected_red
```

## AC-0008-0018: A pass with cross-spec obligations is reported as accepted with debt

- US-Refs: US-0008-0009

```gherkin
# AC-0008-0018
# Source: discussion-20260923171450572#REQ-0037
Scenario: A pass with cross-spec obligations is reported as accepted with debt
  Given the ATDD gate reached PASS with cross-spec obligations
  When the stage returns its result
  Then the outcome is accepted_with_debt
  And each cross-spec obligation is one debt naming its owning spec and its resolving owner
  And a residual finding with no named owner is never handed on as a debt
```

## AC-0008-0019: A test that cannot reach its assertion takes the seam round trip first

- US-Refs: US-0008-0009

```gherkin
# AC-0008-0019
# Source: discussion-20260923171450572#REQ-0038
Scenario: A test that cannot reach its assertion takes the seam round trip first
  Given an acceptance test that cannot reach its assertion because a route, export or module is missing
  When the ATDD stage returns
  Then the result is needs_repair with a seam request naming that test
  And once the seam-only result is accepted, the same acceptance stage instance takes RED at the assertion
  And only then is the full implementation handed on
  And the round trip starts no other run and uses the existing red-provenance branch
```

## AC-0008-0020: The layer decision is never served from the shared snapshot

- US-Refs: US-0008-0009

```gherkin
# AC-0008-0020
# Source: discussion-20260923171450572#REQ-0056
Scenario: The layer decision is never served from the shared snapshot
  Given an active run whose shared preflight snapshot is valid
  When the ATDD stage starts
  Then it may reuse the snapshot for the inputs the snapshot covers
  And it decides which acceptance layer each obligation needs from the current spec and ledger
```

## AC-0008-0021: A test fix leaves the ledger row's status alone

- US-Refs: US-0008-0010

```gherkin
# AC-0008-0021
# Source: discussion-20260923171450572#DAC-003-02
Scenario: A test fix leaves the ledger row's status alone
  Given diagnosis found a defective existing test on an ATDD-owned ledger row
  When /qfai-atdd fixes the test in a test_fix stage
  Then the result names the AC or BR the expectation cites before and after the fix
  And it carries an independent review and a re-run of the test
  And the row's status, TC references, layer and boundary are unchanged
  And the re-run is appended to the row's evidence section as a re-verify record
```

## AC-0008-0022: A fix that changes the expectation's meaning goes back to SDD

- US-Refs: US-0008-0010

```gherkin
# AC-0008-0022
# Source: discussion-20260923171450572#DAC-003-03
Scenario: A fix that changes the expectation's meaning goes back to SDD
  Given a test fix after which the expectation would cite a different AC or BR
  When the ATDD stage returns
  Then the result is needs_repair listing that finding with qfai-sdd as its resolving owner
  And no accepted test fix is returned
```

## AC-0008-0023: ATDD takes a test fix only for an acceptance-layer row

- US-Refs: US-0008-0010

```gherkin
# AC-0008-0023
# Source: discussion-20260923171450572#DAC-003-01
Scenario: ATDD takes a test fix only for an acceptance-layer row
  Given a defective test's ledger row
  When the row's layer is E2E or API, or Integration with a TC at a level other than L1 or L2
  Then /qfai-atdd serves the test_fix work order
  And it serves none for a Unit, Component or all-L1-or-L2 Integration row
```
