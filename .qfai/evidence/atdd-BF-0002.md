# ATDD evidence — BF-0002

## Scope

The flow owns 23 US, 60 AC and 111 EX rows. The [BF E2E test](../../packages/qfai/tests/e2e/bf0002CiReleaseFlowE2E.test.ts) has the matching annotation and observable assertions. This record does not claim a current test-suite run or reviewer sign-off.

The matrix maps every ID from the current story tree to a layer, an assertion candidate or a gap, and six depth dimensions. EX implementation tests remain the implement owner's responsibility.

## Coverage Depth Matrix

[coverage-depth-BF-0002.md](coverage-depth-BF-0002.md) — ✅ 0 / ⚠️ 37 / ❌ 550. The counts cover scored cells; `—` means the row has no declared case in that dimension.

## Evidence and remaining work

- Source: `.qfai/spec/02_business-flow/business-flow-0002/` (all story, AC and EX files).
- Static inspection: annotations and nearby `expect(...)` or `assert(...)` calls in `packages/qfai/tests/**`. A candidate is partial until its asserted behavior and CI outcome are checked.
- Test execution: not run locally, per the session's CI-only instruction. No RED/GREEN or falsifiability result is claimed.
- Required next action: ATDD resolves BF/AC and story-level gaps, Implement resolves EX gaps, then CI executes the selected tests and the matrix is rescored from actual outcomes.
- Review gate: independent completion and QA review remains pending.
