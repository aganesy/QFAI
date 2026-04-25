# 05 Examples

## EX-0012-0001: Declared Screen Has Complete Evidence

- BR-Ref: BR-0012-0002
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And `.qfai/evidence/prototyping/screenshots/orders-dashboard.png` exists
- And `.qfai/evidence/prototyping/html/orders-dashboard.html` exists
- Then validate does not emit `QFAI-UIE-001/002` for that screen

## EX-0012-0002: Screenshot Missing

- BR-Ref: BR-0012-0003
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And the HTML snapshot exists
- And the screenshot does not exist
- Then validate emits `QFAI-UIE-001`
- And the skill must rerun capture before completion

## EX-0012-0003: HTML Missing

- BR-Ref: BR-0012-0003
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And the screenshot exists
- And the HTML snapshot does not exist
- Then validate emits `QFAI-UIE-002`
- And the skill must rerun capture before completion

## EX-0012-0086: Step 0 Planning

- BR-Ref: BR-0012-0001
- Given `/qfai-prototyping` starts a new iteration
- When the skill prepares execution planning
- Then it records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`

## EX-0012-0089: Evaluator Inputs

- BR-Ref: BR-0012-0005
- Given screenshots and HTML snapshots are captured
- And evaluation rubric is available from `.qfai/contracts/design/evaluation-rubric.yaml`
- And evaluator calibration is available from `.qfai/contracts/design/evaluator-calibration.yaml`
- And prior reviewer-score context exists from a previous iteration
- And `.qfai/contracts/design/design-system.yaml` exists
- Then the L1/L2 evaluators receive all five input classes before scoring

## EX-0012-0090: Initial Funnel

- BR-Ref: BR-0012-0001
- Given `/qfai-prototyping` starts from exploration inputs
- When the first exploration pass runs
- Then 5 divergent directions are generated
- And the result converges through `5->3->2->1`

## EX-0012-0091: Legacy Lighthouse Gate

- BR-Ref: BR-0012-0008
- Given a legacy full-harness-style artifact on `web`
- And no Lighthouse evidence is attached
- Then the validator/reference slice may emit a Lighthouse-related issue
- But this does not reintroduce a public `--mode full-harness` contract

## EX-0012-0092: Breakthrough Trigger

- BR-Ref: BR-0012-0014
- Given `allReviewerAxesPerfect100` is false
- And recent `averageScore` deltas are below the configured plateau threshold
- And code diff lines are below the configured diff threshold
- Then plateau detector sets `triggerResult=true`
- And `.qfai/evidence/breakthrough.json` records the trigger reasons

## EX-0012-0094: Reviewer-Score Iteration

- BR-Ref: BR-0012-0012
- Given `fullHarness.iterations[1]`
- And it stores two reviewers with per-axis `score`, `rationale`, and `evidenceRefs`
- And `allReviewerAxesPerfect100` is `true`
- Then the iteration is compliant with the current evidence schema

## EX-0012-0095: Snapshot-Based Scoring Trace

- BR-Ref: BR-0012-0013
- Given the latest iteration has two reviewers and six total axis scores
- When history is recomputed
- Then `scoringTrace` stores `reviewerCount=2`, `axisCount=6`, `minScore`, `averageScore`, `allReviewerAxesPerfect100`, and `commitSha`

## EX-0012-0096: Iteration Budget Summary

- BR-Ref: BR-0012-0011, BR-0012-0015
- Given internal mode resolution is `standard`
- And two iterations have been recorded
- Then full-harness result output reports `maxIterations=3` and `remainingIterations=1`

## EX-0012-0097: Termination From Threshold Or Budget

- BR-Ref: BR-0012-0014
- Given the latest iteration has `allReviewerAxesPerfect100=true`
- Then termination is `converged`

## EX-0012-0103: 95 Points Is Not Completion

- BR-Ref: BR-0012-0012, BR-0012-0014
- Given every reviewer score is at least 95 but one axis is 99
- Then `completionEligible` is false
- And completion claim is rejected

## EX-0012-0104: Perfect 100 Completion

- BR-Ref: BR-0012-0012, BR-0012-0014, BR-0012-0015
- Given every reviewer sub-agent scores every evaluation axis at 100
- And post-selection polish, breakthrough check, reviewer gate, and validate pass are recorded
- Then `completionEligible` may be true
- And if convergence is not reached by the last allowed iteration, termination becomes `max-iterations`

## EX-0012-0098: Delegation Scope And Reviewer Roles

- BR-Ref: BR-0012-0004
- Given `/qfai-prototyping` declares a Delegation Scope Table
- Then UI implementation, screenshot capture, evaluation scoring, and build roles are named explicitly
- And invalid role assignments are surfaced as findings

## EX-0012-0099: Validate Gate Before Completion

- BR-Ref: BR-0012-0006
- Given prototyping evidence exists
- When completion is evaluated
- Then `qfai validate --fail-on error` is required before the run can be accepted

## EX-0012-0100: Verify Gate Blocks On REVISE

- BR-Ref: BR-0012-0007
- Given `/qfai-verify` leaves a `REVISE` review artifact
- Then prototyping completion remains blocked

## EX-0012-0101: Non-UI Exclusion

- BR-Ref: BR-0012-0009
- Given a spec is classified as `ui_bearing: false`
- When prototyping execution scope is determined
- Then the spec is excluded from prototyping execution
- And missing screen contracts do not over-fire UI evidence requirements

## EX-0012-0102: Legacy Traceability Space Retained

- BR-Ref: BR-0012-0010
- Given legacy traceability IDs remain present in historical ledgers
- Then current documentation keeps the identifier space reserved
- And it does not restore weighted-total-only runtime narratives

## EX-0012-0105: Round-Start Produces Candidate-Scoped Artifacts

- BR-Ref: BR-0012-0016
- Given round `r3` has survivors `c1`, `c3`, and `c5`
- When internal prototyping artifact generation starts the round
- Then QFAI writes `command-plans.json` and `review-bundle.json` under `.qfai/evidence/prototyping/rounds/r3/`
- And each candidate uses `.qfai/evidence/prototyping/rounds/r3/candidates/<candidate-id>/<screen-id>.*`

## EX-0012-0106: Harvest And Absorption Keep Losing Ideas Visible

- BR-Ref: BR-0012-0017
- Given round `r5` harvest captures strengths from dropped candidates
- When round `r3` absorption planning begins
- Then each survivor classifies every `harvestId` as `applied` or `rejected`
- And rejected entries explain why the idea was not absorbed

## EX-0012-0107: Concept Regression Blocks Advance

- BR-Ref: BR-0012-0018
- Given round `r2` evaluator review reports `conceptFit.regressionAlert=true`
- When the next narrowing decision is evaluated
- Then round advance is rejected
- And the absorption plan must be re-curated before proceeding
