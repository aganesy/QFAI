# ATDD Evidence — BF-0003

## Scope

The story tree contains 16 stories, 40 criteria and 80 examples. The existing BF journey is [bf0003DoctorRepairFlowE2E.test.ts](../../packages/qfai/tests/e2e/bf0003DoctorRepairFlowE2E.test.ts). The matrix lists every ID and records static test candidates and gaps.

## Coverage Depth Matrix

See [coverage-depth-BF-0003.md](coverage-depth-BF-0003.md).

✅ 0 / ⚠️ 115 / ❌ 215 across 330 scored cells; 486 cells are not applicable.

The new [BF-0003 acceptance integration tests](../../packages/qfai/tests/integration/bf0003Acceptance.test.ts) assert configuration presence and absence, configured path diagnostics, JSON and file output, failure thresholds, and workflow drift placement. The BF E2E journey now attributes seven stories to specific assertions. These 19 depth cells remain candidates until CI executes them. The workflow drift placement assertion checks the `warnings advisory of drift` heading required by `AC-0003-0011-02`.

The [BF-0003 example tests](../../packages/qfai/tests/unit/bf0003Examples.test.ts) cover doctor summary counts and explicit guardrail listing, ordering, and LLM formatting. The former coverage placeholders for `BR-0006-0006`, `BR-0007-0005`, and `BR-0007-0010` now state observable behavior. The extract example is `EX-0003-0014-03` under its owning story and criterion; it replaces `EX-0003-0013-05`. These assertions remain candidates until CI executes them.

## Execution and disposition

- Local test suites: not run, per the session instruction that test suites execute in CI. No RED/GREEN or pass claim is made.
- Static evidence: story artifact ID enumeration; ID-specific test review; matrix arithmetic; Prettier and targeted ESLint. Candidate assertions await a selected CI result.
- Handoff: acceptance-test-engineer owns BF/AC gaps; implementation owns EX gaps. Reviewers and qa-gatekeeper have not signed off this revision. The flow cannot be reported PASS from this evidence.
