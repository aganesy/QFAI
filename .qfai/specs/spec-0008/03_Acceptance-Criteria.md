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
