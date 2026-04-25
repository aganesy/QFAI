# 03 Acceptance Criteria

## AC-0012-0001

- `/qfai-prototyping` documents Step 0 execution planning before the first capture/evaluation cycle.
- Step 0 names `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`.
- Delegation scope and invalid role handling are documented in the same execution-planning posture.

## AC-0012-0002

- Declared screen evidence uses the canonical screenshot and HTML snapshot paths.
- Documentation names the canonical paths explicitly.

## AC-0012-0003

- Missing screenshot or HTML evidence is fail-closed.
- Capture guidance does not allow fake evidence generation.

## AC-0012-0004

- Evaluator/reviewer role ownership is documented.
- The skill spells out which roles own implementation, screenshot capture, evaluation scoring, and build.

## AC-0012-0005

- Evaluator input guidance names screenshots, HTML snapshots, rubric/calibration inputs, prior reviewer-score context, and design-system input.
- Review guidance also names the visual checklist categories used during scoring.

## AC-0012-0006

- `qfai validate --fail-on error` is documented as the machine gate before completion.

## AC-0012-0007

- `/qfai-verify` is documented as the final review gate.
- Completion remains blocked on `REVISE`.

## AC-0012-0008

- Legacy validation slices may still require `executionPlan`, Lighthouse evidence, design-system compliance, and calibration overrides.
- These requirements are documented as validator/reference behavior, not as a public mode contract.

## AC-0012-0009

- `ui_bearing: false` specs are excluded from prototyping execution.
- Missing screen contracts do not over-fire UI-only requirements for non-UI specs.

## AC-0012-0010

- Legacy traceability identifier space remains reserved.
- Active wording does not reintroduce superseded weighted-total narratives.

## AC-0012-0011

- Internal mode budgets are documented as low-cost=1, standard=3, and full-harness=20.
- These values are framed as implementation detail rather than a negotiated public runtime interface.

## AC-0012-0012

- `fullHarness.iterations[]` stores `reviewerScores[]` and `allReviewerAxesPerfect100`.
- Weighted-total-only summaries are not the active schema.

## AC-0012-0013

- `fullHarness.scoringTrace[]` is derived from iteration snapshots.
- Snapshots record reviewer count, axis count, min score, average score, `allReviewerAxesPerfect100`, and commit SHA.

## AC-0012-0014

- Termination reason is `converged` only when the latest iteration has `allReviewerAxesPerfect100=true`.
- Iteration budget exhaustion without perfect 100 is not stage completion and must be reported as rework/revise.

## AC-0012-0016

- Completion claim is invalid when the latest iteration is `select`.
- Completion claim requires at least one post-selection `polish` iteration.
- The `polish` iteration records critique, fix, re-capture, re-review, and breakthrough check.

## AC-0012-0017

- Completion claim requires every reviewer sub-agent to score every evaluation axis at 100.
- Scores of 95 through 99 are insufficient for completion.
- 95-point wording may remain only as a quality-scale explanation, not as a completion border.

## AC-0012-0018

- Completion claim requires a completion certificate with reviewer gate result, validate command/result, best-of-history ref, and breakthrough ref.
- Validator emits an error when completed/completionEligible is recorded without this certificate.

## AC-0012-0015

- Full-harness result output includes `iterationBudget.maxIterations` and `iterationBudget.remainingIterations`.

## Completion Gate

- `/qfai-prototyping` completion requires `qfai validate --fail-on error` pass.
- Declared screen evidence must include both screenshot and HTML snapshot.
- `/qfai-verify` must leave a review artifact with `PASS` or `REVISE`.

## Superseded Contract Notes

- Active docs must not present `qfai prototyping` as a valid command.
- Active docs must not present weighted-total scoring as the current evidence contract.
- Internal mode helpers may still exist, provided they are clearly scoped as implementation detail.

## Absorbed Legacy Acceptance Registry

The following acceptance IDs remain valid after deleting `spec-0017/` and
`spec-0018/`. They are preserved here as appendix-style registry entries.

### Former spec-0017 acceptance criteria (absorbed)

| Legacy AC    | Preserved expectation in spec-0012                                                |
| ------------ | --------------------------------------------------------------------------------- |
| AC-0017-0001 | Mode obligations remain identical except for `maxCycles`.                         |
| AC-0017-0002 | Playwright CLI command plans remain deterministic.                                |
| AC-0017-0003 | Evaluator reviews remain tied to concrete evidence refs.                          |
| AC-0017-0004 | Review-cycle completeness remains machine-verifiable.                             |
| AC-0017-0005 | Internal artifact-generation CLI helpers remain deterministic and non-evaluating. |
| AC-0017-0006 | Legacy config keys remain hard errors with actionable migration text.             |
| AC-0017-0007 | Missing screenshot evidence still fails all modes.                                |
| AC-0017-0008 | Missing reviewer PASS still fails completion in all modes.                        |
| AC-0017-0009 | `maxCycles` mismatches still emit `QFAI-PROT-MODE-001`.                           |
| AC-0017-0010 | Legacy validator slices still apply across modes when exercised.                  |
| AC-0017-0011 | Playwright MCP remnants remain absent from active package/runtime paths.          |
| AC-0017-0012 | Node Playwright direct invocation remains removed from production code.           |
| AC-0017-0013 | Runtime `.qfai` and packaged init assets remain synchronized.                     |
| AC-0017-0014 | Review bundles still contain the full evaluator input set.                        |
| AC-0017-0015 | Best-of-history, breakthrough, and reviewer PASS remain required in every mode.   |
| AC-0017-0016 | `qfai validate` still emits `QFAI-TEST-0001` per todo stub occurrence.            |
| AC-0017-0017 | `qfai init` still ships the `qfai-validate.yml` workflow.                         |
| AC-0017-0018 | `/qfai-implement` still blocks completion while `QFAI-TEST-0001` findings remain. |
| AC-0017-0019 | The QFAI repo still self-validates its shipped test-todo gate in CI.              |

### Former spec-0018 acceptance criteria (absorbed)

| Legacy AC    | Preserved expectation in spec-0012                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| AC-0018-0001 | The funnel remains fixed to rounds `r5`, `r3`, `r2`, `r1` and those rounds do not consume polish-cycle budget. |
| AC-0018-0002 | Evaluator review v2 remains structured with six axes, strengths, and concept/coherence sections.               |
| AC-0018-0003 | Harvest completeness remains explicit and round-local.                                                         |
| AC-0018-0004 | Absorption plans still classify every harvested element as `applied` or `rejected`.                            |
| AC-0018-0005 | Concept coherence regression still blocks advance.                                                             |
| AC-0018-0006 | Minimum absorptions per survivor remain enforced.                                                              |
| AC-0018-0007 | Concept-fit hard floors still apply to narrowing.                                                              |
| AC-0018-0008 | Candidate rendering remains path-based and parallel.                                                           |
| AC-0018-0009 | Round CLI commands remain deterministic artifact writers.                                                      |
| AC-0018-0010 | Legacy iteration artifacts remain superseded by round-aware evidence expectations.                             |
