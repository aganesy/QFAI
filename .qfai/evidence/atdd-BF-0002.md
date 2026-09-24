# ATDD evidence — BF-0002

## Scope

The flow owns 23 US, 60 AC and 111 EX rows. The [BF E2E test](../../packages/qfai/tests/e2e/bf0002CiReleaseFlowE2E.test.ts) has the matching annotation and observable assertions. This record does not claim a current test-suite run or reviewer sign-off.

The matrix maps every ID from the current story tree to a layer, an assertion candidate or a gap, and six depth dimensions. EX implementation tests remain the implement owner's responsibility.

## Coverage Depth Matrix

[coverage-depth-BF-0002.md](coverage-depth-BF-0002.md) — ✅ 0 / ⚠️ 77 / ❌ 509. The counts cover scored cells; `—` means the row has no declared case in that dimension.

## Evidence and remaining work

- Source: `.qfai/spec/02_business-flow/business-flow-0002/` (all story, AC and EX files).
- Acceptance tests: `packages/qfai/tests/integration/bf0002Acceptance.test.ts` adds six observable tests for eight ACs. They execute the workflow hygiene lane over clean and planted own/shipped trees, inspect the required verdict and build chain, and verify the CI full-validation wiring. Eleven scored cells gained static assertion candidates. The BF journey remains in `packages/qfai/tests/e2e/bf0002CiReleaseFlowE2E.test.ts`.
- BF2 EX test extension: EX-0002-0001-02/03 and EX-0002-0002-02 now have clean/planted checkout, Node support-floor, and third-party allow-list assertions. These are static candidates until CI and reviewer checks complete.
- Decision alignment: `AC-0002-0016-03` and examples 04/05 follow the later `ci-pass` required-context decision. The test checks that `build` remains reachable and that its verification steps cannot silently continue on error.
- Static inspection: annotations and nearby `expect(...)` or `assert(...)` calls in `packages/qfai/tests/**`. EX-0002-0009-01/02 compare the three distributed-surface guards over initialized content, numeric boundaries and legacy composites. EX-0002-0012-01/02 assert the comment scanner's exact violation set and lint-lane wiring. EX-0002-0021-01–04/06 and EX-0002-0022-01/02 assert the accepted assistant-tree layout and rejected retired paths. A candidate is partial until its CI outcome and reviewer assessment are checked.
- Test execution: not run locally, per the session's CI-only instruction. No RED/GREEN or falsifiability result is claimed.
- Required next action: ATDD resolves BF/AC and story-level gaps, Implement resolves EX gaps, then CI executes the selected tests and the matrix is rescored from actual outcomes.
- Review gate: independent completion and QA review remains pending.
