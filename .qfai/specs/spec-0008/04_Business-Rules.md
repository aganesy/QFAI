# 04 Business Rules

## BR-0008-0001: Layer-Annotation Mapping

- AC-Refs: AC-0008-0001

- E2E tests (`tests/e2e/**`) MUST use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration tests (`tests/integration/**`) MUST use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API tests (`tests/api/**`) MUST use `QFAI:CON-API-XXXX` annotations.

## BR-0008-0002: Forbidden Cross-Layer References

- AC-Refs: AC-0008-0002

- `tests/api/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.
- `tests/e2e/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.

## BR-0008-0003: Volume Signals Are Not Gates

- AC-Refs: AC-0008-0003

- Volume floors and ratios are planning signals only, not completion gates.
- Coverage obligations (all required US/TC/CON-API covered) are the gate.

## BR-0008-0004: Completion Separation

- AC-Refs: AC-0008-0004

- Implementation and completion approval MUST be separate roles.
- The Reviewer MUST be non-edit (returns only PASS or REVISE).

## BR-0008-0005: Unknown Reference Treatment

- AC-Refs: AC-0008-0005

- Unknown references (US/TC/CON-API not declared in spec) MUST be treated as errors.

## BR-0008-0006: Evidence File Requirement

- AC-Refs: AC-0008-0006

- Evidence file MUST exist under `.qfai/evidence/` and MUST NOT be committed to git.

## BR-0008-0007: Normal-Path-Only Test Cases Are Incomplete

- AC-Refs: AC-0008-0009

- A US/TC that has only normal-path (happy-path) test cases is considered incomplete.
- Each US/TC MUST have at minimum one normal-path AND one error/boundary/edge test case.
- The Coverage Depth Matrix MUST be produced by `test-design-analyst` and verified by `qa-gatekeeper`.

## BR-0008-0008: ATDD Scaffold Skeleton Shape and Placeholder Lifecycle

- AC-Refs: AC-0008-0010

- `qfai atdd scaffold --spec spec-NNNN` MUST read the spec test_cases and emit one `tests/atdd/spec-NNNN/<TC-ID>.test.*` file per TC (framework path appropriate to the project).
- Each emitted skeleton MUST import the test-framework primitives, contain `// TODO: implement assertion for <TC-ID>`, and reference the related `US-*` / `CON-API-*` via comments.
- `qfai validate` MUST emit `D-SCAFFOLD-PLACEHOLDER` (severity warning) for any skeleton whose `// TODO: implement assertion for <TC-ID>` is still present.

## BR-0008-0009: ATDD Scaffold Idempotency and Warning→Error Escalation

- AC-Refs: AC-0008-0011

- Re-running scaffold MUST NOT overwrite existing non-TODO content (idempotent); only files still carrying the TODO marker (or absent files) may be (re)written.
- `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error after 3 `qfai validate` cycles with the placeholder unremoved (DR-0272), configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`. The default of 3 gives an operator a normal red→green TDD turnaround before the placeholder hard-blocks completion-claim.
