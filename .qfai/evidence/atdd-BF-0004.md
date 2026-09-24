# ATDD Evidence — BF-0004

## Scope

The story tree contains 12 stories, 30 criteria and 85 examples. The BF journey is [bf0004MigrationCutoverE2E.test.ts](../../packages/qfai/tests/e2e/bf0004MigrationCutoverE2E.test.ts). [bf0004Acceptance.test.ts](../../packages/qfai/tests/integration/bf0004Acceptance.test.ts) adds behavior assertions for 22 criteria. The matrix lists every ID and records static test candidates and gaps.

## Coverage Depth Matrix

See [coverage-depth-BF-0004.md](coverage-depth-BF-0004.md).

✅ 0 / ⚠️ 25 / ❌ 403 across 428 scored cells; 334 cells are not applicable.

## Execution and disposition

- Local test suites: not run, per the session instruction that test suites execute in CI. No RED/GREEN or pass claim is made.
- New integration selectors: bf0004Acceptance.test.ts has 22 annotated AC tests with filesystem, exit-code, validator, link and contract assertions. CI execution and ID-specific oracle review remain pending. The remaining eight criteria and uncovered depth cells remain open.
- Static evidence: story artifact ID enumeration; test annotation and assertion candidate scan; matrix arithmetic. Candidate assertions await ID-specific oracle review and a selected CI result.
- Handoff: acceptance-test-engineer owns BF/AC gaps; implementation owns EX gaps. Reviewers and qa-gatekeeper have not signed off this revision. The flow cannot be reported PASS from this evidence.
