# ATDD Evidence — BF-0004

## Scope

The story tree contains 12 stories, 30 criteria and 85 examples. The BF journey is [bf0004MigrationCutoverE2E.test.ts](../../packages/qfai/tests/e2e/bf0004MigrationCutoverE2E.test.ts). [bf0004Acceptance.test.ts](../../packages/qfai/tests/integration/bf0004Acceptance.test.ts) adds assertions for all 30 criteria. The matrix lists every ID and records static test candidates and gaps.

## Coverage Depth Matrix

See [coverage-depth-BF-0004.md](coverage-depth-BF-0004.md).

✅ 0 / ⚠️ 86 / ❌ 253 across 339 scored cells; 423 cells are not applicable.

## Execution and disposition

- Local test suites: not run, per the session instruction that test suites execute in CI. No RED/GREEN or pass claim is made.
- New integration selectors: bf0004Acceptance.test.ts has 30 annotated AC tests with filesystem, exit-code, validator, link and contract assertions. CI execution and ID-specific oracle review remain pending. The uncovered depth cells remain open.
- The implementation layer adds [bf0004Examples.test.ts](../../packages/qfai/tests/unit/bf0004Examples.test.ts) and annotates existing migration unit tests for 55 EX IDs. Their exercised axes are ⚠ until CI executes the files; the remaining EX obligations stay ❌ with the implementation owner.
- Applicability audit: all 127 US, AC and EX rows were checked against their source scenarios. Unsupported axes, including the error, special and combinatorial cells of US-0004-0001, are excluded from the scored total. Declared axes without an ID-specific oracle remain ❌.
- Static evidence: story artifact ID enumeration; test annotation and assertion candidate scan; matrix arithmetic. Candidate assertions await ID-specific oracle review and a selected CI result.
- Handoff: acceptance-test-engineer owns BF/AC gaps; implementation owns EX gaps. Reviewers and qa-gatekeeper have not signed off this revision. The flow cannot be reported PASS from this evidence.
