# ATDD Evidence — BF-0004

## Scope

The story tree contains 13 stories, 38 criteria and 119 examples. The BF journeys are [bf0004MigrationCutoverE2E.test.ts](../../packages/qfai/tests/e2e/bf0004MigrationCutoverE2E.test.ts) and [bf0004MigrationOutcomesE2E.test.ts](../../packages/qfai/tests/e2e/bf0004MigrationOutcomesE2E.test.ts). [bf0004Acceptance.test.ts](../../packages/qfai/tests/integration/bf0004Acceptance.test.ts) adds assertions for all 30 criteria. The matrix lists every ID and records static test candidates and gaps.

## Coverage Depth Matrix

See [coverage-depth-BF-0004.md](coverage-depth-BF-0004.md).

✅ 0 / ⚠️ 194 / ❌ 191 across 385 scored cells; 635 cells are not applicable.

## Execution and disposition

- Local test suites: the files the concrete-abstract cycle on BF-0004 changed were run locally and passed (see [sdd-BF-0004.md](sdd-BF-0004.md)). No other pass claim is made.
- New integration selectors: bf0004Acceptance.test.ts has 31 annotated AC tests with filesystem, exit-code, validator, link and contract assertions. CI execution and ID-specific oracle review remain pending. The uncovered depth cells remain open.
- The implementation layer adds [bf0004Examples.test.ts](../../packages/qfai/tests/unit/bf0004Examples.test.ts) and annotates existing migration unit tests for 104 EX IDs. Their exercised axes are ⚠ until CI executes the files; the remaining EX obligations stay ❌ with the implementation owner.
- Applicability audit: all 170 US, AC and EX rows were checked against their source scenarios. Unsupported axes, including the error, special and combinatorial cells of US-0004-0001, are excluded from the scored total. Declared axes without an ID-specific oracle remain ❌.
- Static evidence: story artifact ID enumeration; test annotation and assertion candidate scan; matrix arithmetic. Candidate assertions await ID-specific oracle review and a selected CI result.
- Handoff: acceptance-test-engineer owns BF/AC gaps; implementation owns EX gaps. Reviewers and qa-gatekeeper have not signed off this revision. The flow cannot be reported PASS from this evidence.
