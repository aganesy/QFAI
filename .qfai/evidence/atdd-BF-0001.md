# ATDD evidence — BF-0001

## Scope

The flow owns 189 US, 333 AC and 486 EX rows. The [BF E2E test](../../packages/qfai/tests/e2e/bf0001DevelopVerifyFlowE2E.test.ts) has the matching annotation and observable assertions across the development and verification flow. This record does not claim a current test-suite run or reviewer sign-off.

The matrix maps every ID from the current story tree to a layer, an assertion candidate or a gap, and six depth dimensions. EX implementation tests remain the implement owner's responsibility.

## Coverage Depth Matrix

[coverage-depth-BF-0001.md](coverage-depth-BF-0001.md) — ✅ 0 / ⚠️ 122 / ❌ 2141. The counts cover scored cells; `—` means the row has no declared case in that dimension.

## Evidence and remaining work

- Source: `.qfai/spec/02_business-flow/business-flow-0001/` (all story, AC and EX files).
- Consulted open BF-0001 work-log entry [2026-09-12-spec-0002-two-statements-the-product-replaced](../steering/2026-09-12-spec-0002-two-statements-the-product-replaced.md); its historical conflict is not counted as test coverage.
- Static inspection: annotations and nearby `expect(...)` or `assert(...)` calls in `packages/qfai/tests/**`. Four BF-0001 AC selectors in `packages/qfai/tests/integration/bf0001Acceptance.test.ts` now assert seeded roots, exact story files and rejection of an extra directory, parent-flow numbering, and AC-to-EX reference cardinality. A candidate is partial until its CI outcome and reviewer assessment are checked.
- CI command: `pnpm -C packages/qfai test`. Selected assets: `tests/integration/bf0001Acceptance.test.ts` (four AC selectors) and `tests/e2e/bf0001DevelopVerifyFlowE2E.test.ts` (the BF journey). Result: pending CI; neither suite was run locally.
- Test execution: not run locally, per the session's CI-only instruction. No RED/GREEN or falsifiability result is claimed.
- Required next action: ATDD resolves BF/AC and story-level gaps, Implement resolves EX gaps, then CI executes the selected tests and the matrix is rescored from actual outcomes.
- Review gate: independent completion and QA review remains pending.
