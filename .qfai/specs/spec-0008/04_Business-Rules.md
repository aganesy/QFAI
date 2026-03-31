# 04 Business Rules

## BR-0008-0001: Layer-Annotation Mapping

- E2E tests (`tests/e2e/**`) MUST use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration tests (`tests/integration/**`) MUST use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API tests (`tests/api/**`) MUST use `QFAI:CON-API-XXXX` annotations.

## BR-0008-0002: Forbidden Cross-Layer References

- `tests/api/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.
- `tests/e2e/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.

## BR-0008-0003: Volume Signals Are Not Gates

- Volume floors and ratios are planning signals only, not completion gates.
- Coverage obligations (all required US/TC/CON-API covered) are the gate.

## BR-0008-0004: Completion Separation

- Implementation and completion approval MUST be separate roles.
- The Reviewer MUST be non-edit (returns only PASS or REVISE).

## BR-0008-0005: Unknown Reference Treatment

- Unknown references (US/TC/CON-API not declared in spec) MUST be treated as errors.

## BR-0008-0006: Evidence File Requirement

- Evidence file MUST exist under `.qfai/evidence/` and MUST NOT be committed to git.
