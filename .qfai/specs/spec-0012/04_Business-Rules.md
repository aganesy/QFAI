# 04 Business Rules

## BR-0012-0001: Skill-First Interface

- AC-Refs: AC-0012-0001
- `/qfai-prototyping [--auto]` が active interface である。
- `qfai prototyping` は active public command ではない。

## BR-0012-0002: Mandatory UI Evidence

- AC-Refs: AC-0012-0002
- Every declared screen in `.qfai/contracts/ui/*.yaml` must have:
  - `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
  - `.qfai/evidence/prototyping/html/<screen-id>.html`

## BR-0012-0003: Missing Evidence Is Fail-Closed

- AC-Refs: AC-0012-0003
- If either the screenshot or HTML snapshot is missing, the screen is treated as incomplete.
- The iteration cannot be accepted until evidence is re-captured.

## BR-0012-0004: Evaluator Roles

- AC-Refs: AC-0012-0004
- L1 evaluates implementation fidelity and blocking UI failures.
- L2 evaluates product experience, exploration rubric, and design-system alignment.
- L3 performs reviewer / verify gate auditing.

## BR-0012-0005: Evaluator Inputs

- AC-Refs: AC-0012-0005
- L1/L2 evaluation uses screenshots, HTML snapshots, evaluation rubric, evaluator calibration, prior reviewer-score context, and finalized design system.
- Reviewer findings must explicitly name missing mandatory inputs.

## BR-0012-0006: Validate Gate

- AC-Refs: AC-0012-0006
- `qfai validate --fail-on error` is the machine gate for schema/evidence integrity.
- Validate does not replace human/sub-agent evaluation.

## BR-0012-0007: Verify Gate

- AC-Refs: AC-0012-0007
- `/qfai-verify` confirms validate pass, review artifact presence, and unresolved blocking findings.
- Completion is blocked on `REVISE`.

## BR-0012-0008: Legacy Validation Slice

- AC-Refs: AC-0012-0008
- The following artifacts may still be validated when present:
  - `executionPlan`
  - Lighthouse evidence for legacy web validation
  - `designSystemCompliance`
  - calibration overrides
- These checks are validator/reference behavior only and must not be interpreted as a public runtime contract.

## BR-0012-0009: Non-UI Exclusion

- AC-Refs: AC-0012-0009
- `ui_bearing: false` specs are excluded from prototyping execution.
- Validate must not over-fire UI evidence rules when there is no screen contract.

## BR-0012-0010: Legacy Traceability IDs

- AC-Refs: AC-0012-0010
- Existing user-story IDs and legacy test-case identifier space remain reserved.
- New wording may supersede old runtime narratives without renumbering historical coverage IDs.

## BR-0012-0011: Internal Mode Budgets

- AC-Refs: AC-0012-0011
- Internal mode helper budgets are low-cost=1, standard=3, full-harness=20.
- These values guide iteration limits but are not a public user-facing negotiation contract.

## BR-0012-0012: Reviewer-Score Iteration Schema

- AC-Refs: AC-0012-0012
- `fullHarness.iterations[]` records `reviewerScores[]`, `allReviewerAxesPerfect100`, evidence refs, limitations, and change summary.
- Per-axis evidence is attached through reviewer score entries, not a weighted-total aggregate.

## BR-0012-0013: Snapshot Scoring Trace

- AC-Refs: AC-0012-0013
- `fullHarness.scoringTrace[]` is derived from iteration snapshots.
- Each snapshot stores reviewer count, axis count, min score, average score, `allReviewerAxesPerfect100`, and commit SHA.

## BR-0012-0014: Termination Rule

- AC-Refs: AC-0012-0014
- If the latest iteration has `allReviewerAxesPerfect100=true`, termination reason is `converged`.
- If any reviewer axis is below 100, completion is blocked even when the score is 95 or higher.
- Winner selection is not completion; stage completion requires post-selection polish and a completion certificate.
- Otherwise, reaching the configured max iteration budget yields `max-iterations`.

## BR-0012-0015: Result Writer Summary

- AC-Refs: AC-0012-0015
- Full-harness result output reports the latest snapshot summary.
- Result output reports `iterationBudget.maxIterations` and `iterationBudget.remainingIterations`.

## Absorbed Legacy Business Rules

The following rule IDs remain valid after deleting `spec-0017/` and
`spec-0018/`. They are preserved here so existing traceability comments and
review artifacts continue to resolve.

### Former spec-0017 rules (absorbed)

| Legacy BR    | Preserved rule                                                                              |
| ------------ | ------------------------------------------------------------------------------------------- |
| BR-0017-0001 | Mode obligations still differ only by `maxCycles`.                                          |
| BR-0017-0002 | `playwright-cli` remains the sole supported browser tool.                                   |
| BR-0017-0003 | Command-plan generation remains deterministic for equal input.                              |
| BR-0017-0004 | QFAI still does not compute visual scores itself.                                           |
| BR-0017-0005 | Evidence refs remain concrete, non-placeholder artifact paths.                              |
| BR-0017-0006 | Retained cycle evidence remains required when the legacy reviewer-score slice is exercised. |
| BR-0017-0007 | Canonical latest screenshot/HTML paths still mirror the newest compatible evidence.         |
| BR-0017-0008 | Internal artifact-generation CLI helpers still do not evaluate or capture evidence.         |
| BR-0017-0009 | Legacy config keys remain hard errors rather than silent aliases.                           |
| BR-0017-0010 | The strictest completion gate still applies across all modes.                               |
| BR-0017-0011 | Validator branching by mode remains prohibited outside `maxCycles`.                         |
| BR-0017-0012 | Playwright MCP remains absent from the standard path.                                       |
| BR-0017-0013 | Node Playwright direct calls remain removed from production code.                           |
| BR-0017-0014 | Runtime and packaged skill trees remain synchronized.                                       |
| BR-0017-0015 | Review bundles still include the evaluator input set plus command-plan ref.                 |
| BR-0017-0016 | `bestOfHistory` and `breakthrough` remain mandatory completion evidence.                    |
| BR-0017-0017 | `FullHarnessIterationEvidence` remains superseded by `PrototypingCycleEvidence`.            |
| BR-0017-0018 | Legacy screenshot-capture scripts remain removed.                                           |
| BR-0017-0019 | Test-todo detection remains regex-based and per-occurrence.                                 |
| BR-0017-0020 | `forbidTestTodoStubs` remains the explicit opt-out switch.                                  |

### Former spec-0018 rules (absorbed)

| Legacy BR    | Preserved rule                                                                   |
| ------------ | -------------------------------------------------------------------------------- |
| BR-0018-0001 | The exploration funnel remains round-based rather than cycle-as-funnel based.    |
| BR-0018-0002 | Polish-cycle budget remains separate from round execution.                       |
| BR-0018-0003 | Evaluator review v2 remains structured rather than free-form.                    |
| BR-0018-0004 | Harvested strengths remain constrained by rubric taxonomy.                       |
| BR-0018-0005 | Harvest scope remains immediate to the source round.                             |
| BR-0018-0006 | Every harvested element still requires explicit curation.                        |
| BR-0018-0007 | Applied absorptions remain concept-compatible or adaptation-planned.             |
| BR-0018-0008 | Candidate concept evidence remains mandatory for active candidates.              |
| BR-0018-0009 | Coherence regression still blocks advance.                                       |
| BR-0018-0010 | Candidate rendering remains path-based rather than multiplexed.                  |
| BR-0018-0011 | Round CLI commands remain deterministic artifact writers.                        |
| BR-0018-0012 | Legacy iteration artifacts remain migration-sensitive and not silently accepted. |
