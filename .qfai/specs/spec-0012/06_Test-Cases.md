# 06 Test Cases

## Active v1.8.2 Cases

## TC-0012-0285

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0001, AC-0012-0004
- Delegation Scope Table lists the required categories and valid roles.

## TC-0012-0286

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0001, AC-0012-0004
- Invalid delegation role is surfaced as a violation.

## TC-0012-0287

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- `executionPlan` validator requires the documented fields when the legacy slice is exercised.

## TC-0012-0288

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- Missing `executionPlan` in the legacy validation slice produces an error.

## TC-0012-0289

- EX-Ref: EX-0012-0086
- AC-Refs: AC-0012-0001
- Step 0 planning fields are documented before the first iteration.

## TC-0012-0290

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0002
- Canonical evidence paths are documented for screenshot and HTML capture.

## TC-0012-0291

- EX-Ref: EX-0012-0002, EX-0012-0003
- AC-Refs: AC-0012-0003
- `capture-screenshots.js` fails closed instead of generating fake PNG evidence.

## TC-0012-0292

- EX-Ref: EX-0012-0086, EX-0012-0090
- AC-Refs: AC-0012-0001
- Skill documents the iteration cycle.

## TC-0012-0293

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0001, AC-0012-0004
- Invalid delegation map entries are surfaced as findings.

## TC-0012-0294

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0005
- Evaluator input protocol names the required input classes.

## TC-0012-0295

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0005
- Reviewer guidance detects missing evaluator inputs.

## TC-0012-0296

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0005
- Visual quality checklist enumerates structural categories.

## TC-0012-0297

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- Legacy Lighthouse gate passes when web evidence is present.

## TC-0012-0298

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- Legacy Lighthouse gate errors when required web evidence is absent.

## TC-0012-0299

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0008
- designSystemCompliance above threshold passes when `design-system.yaml` exists.

## TC-0012-0300

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0008
- designSystemCompliance below threshold surfaces a finding when `design-system.yaml` exists.

## TC-0012-0301

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- designSystemCompliance is skipped when `design-system.yaml` is absent.

## TC-0012-0302

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- Calibration overrides apply when provided.

## TC-0012-0303

- EX-Ref: EX-0012-0091
- AC-Refs: AC-0012-0008
- Defaults are preserved when calibration overrides are absent.

## TC-0012-0304

- EX-Ref: EX-0012-0094
- AC-Refs: AC-0012-0012
- `reviewerScores[]` and `allReviewerAxesPerfect100` are written into full-harness iterations.

## TC-0012-0305

- EX-Ref: EX-0012-0095
- AC-Refs: AC-0012-0013
- `scoringTrace[]` is recomputed as reviewer-score snapshots with min/average score fields.

## TC-0012-0306

- EX-Ref: EX-0012-0095
- AC-Refs: AC-0012-0013
- History consistency validation rejects mismatched iteration / scoringTrace / reviewer log counts.

## TC-0012-0307

- EX-Ref: EX-0012-0096
- AC-Refs: AC-0012-0015
- Full-harness result output exposes `iterationBudget.maxIterations` and `remainingIterations`.

## TC-0012-0308

- EX-Ref: EX-0012-0096
- AC-Refs: AC-0012-0011
- Internal mode helper resolves max iteration budgets to 1 / 3 / 20.

## TC-0012-0309

- EX-Ref: EX-0012-0092, EX-0012-0097
- AC-Refs: AC-0012-0014
- Termination reason is `converged` on `allReviewerAxesPerfect100=true`; budget exhaustion without 100 remains rework/revise.

## TC-0012-0314

- EX-Ref: EX-0012-0103
- AC-Refs: AC-0012-0017
- Completion claim with any reviewer axis below 100 produces an error.

## TC-0012-0315

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0017
- Completion claim with all reviewer axes at 100 satisfies the perfect-score gate.

## TC-0012-0316

- EX-Ref: EX-0012-0104
- AC-Refs: AC-0012-0016, AC-0012-0018
- Completion claim requires post-selection polish checks and completion certificate.

## TC-0012-0310

- EX-Ref: EX-0012-0099
- AC-Refs: AC-0012-0006
- `qfai validate --fail-on error` is documented as the completion-time machine gate.

## TC-0012-0311

- EX-Ref: EX-0012-0100
- AC-Refs: AC-0012-0007
- `/qfai-verify` blocking `REVISE` posture is documented as part of completion.

## TC-0012-0312

- EX-Ref: EX-0012-0101
- AC-Refs: AC-0012-0009
- non-UI specs are excluded from prototyping execution and UI evidence overfire is avoided.

## TC-0012-0313

- EX-Ref: EX-0012-0102
- AC-Refs: AC-0012-0010
- legacy identifier space is retained without reviving weighted-total narratives.

## TC-0012-0317

- EX-Ref: EX-0012-0108
- AC-Refs: AC-0012-0019
- Round `r3` で `originality` の per-axis スコアが `evaluation-rubric.yaml` の `hard_floors[].min_score` を下回る candidate が存在するとき、`validateEvaluatorReviewHardFloor` は `QFAI-PROT-AXIS-FLOOR-001` を error severity で emit する。

## TC-0012-0318

- EX-Ref: EX-0012-0109
- AC-Refs: AC-0012-0019
- Round `r5` で同様に hard_floor 未満の per-axis スコアがあっても、`validateEvaluatorReviewHardFloor` は `QFAI-PROT-AXIS-FLOOR-001` を emit しない（exemption の確認）。

## Legacy Coverage Continuity

- `TC-0012-0001..TC-0012-0284` remain reserved traceability IDs for existing implementation/test slices.
- Their pre-v1.8.1 weighted-total narratives are superseded by the current reviewer-score-centered execution model.
