# ATDD Evidence — BF-0003

## Scope

The story tree contains 16 stories, 34 criteria and 44 examples. The existing BF journey is [bf0003DoctorRepairFlowE2E.test.ts](../../packages/qfai/tests/e2e/bf0003DoctorRepairFlowE2E.test.ts). The matrix lists every ID and records static test candidates and gaps.

## Coverage Depth Matrix

See [coverage-depth-BF-0003.md](coverage-depth-BF-0003.md).

✅ 0 / ⚠️ 48 / ❌ 242 across 290 scored cells; 274 cells are not applicable.

## Execution and disposition

- Local test suites: not run, per the session instruction that test suites execute in CI. No RED/GREEN or pass claim is made.
- Static evidence: story artifact ID enumeration; test annotation and assertion candidate scan; matrix arithmetic. Candidate assertions await ID-specific oracle review and a selected CI result.
- Handoff: acceptance-test-engineer owns BF/AC gaps; implementation owns EX gaps. Reviewers and qa-gatekeeper have not signed off this revision. The flow cannot be reported PASS from this evidence.
