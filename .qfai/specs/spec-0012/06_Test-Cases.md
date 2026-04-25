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

## Legacy Coverage Continuity

- `TC-0012-0001..TC-0012-0284` remain reserved traceability IDs for existing implementation/test slices.
- Their pre-v1.8.1 weighted-total narratives are superseded by the current reviewer-score-centered execution model.

## Absorbed Legacy Coverage Registry

`spec-0017/` and `spec-0018/` are deleted, but their still-relevant test-case IDs
remain registered here so existing traceability comments and reviewer artifacts
continue to resolve.

### Former spec-0017 test cases (absorbed)

| TC-ID        | Title                                                                        | Location                                                                   |
| ------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| TC-0017-0001 | derivePrototypingObligations returns same obligations (except maxCycles)     | `packages/qfai/tests/core/prototypingMode.test.ts`                         |
| TC-0017-0002 | Config load rejects legacy `browserProvider` key                             | `packages/qfai/tests/core/config.test.ts`                                  |
| TC-0017-0003 | Config load rejects legacy `renderProvider` key                              | `packages/qfai/tests/core/config.test.ts`                                  |
| TC-0017-0004 | Config accepts `browserTool: playwright-cli`                                 | `packages/qfai/tests/core/config.test.ts`                                  |
| TC-0017-0005 | buildPlaywrightCliCommandPlan is deterministic                               | `packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts`           |
| TC-0017-0006 | Command plan has canonical command structure                                 | `packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts`           |
| TC-0017-0007 | Output paths remain canonical under the retained cycle evidence slice        | `packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts`           |
| TC-0017-0008 | Review bundle has all required evaluator-facing fields                       | `packages/qfai/tests/core/prototyping/reviewBundle.test.ts`                |
| TC-0017-0009 | Review bundle references command plan file                                   | `packages/qfai/tests/core/prototyping/reviewBundle.test.ts`                |
| TC-0017-0010 | PrototypingCycleEvidence schema round-trips                                  | `packages/qfai/tests/core/prototyping/evidenceRecord.test.ts`              |
| TC-0017-0011 | Canonical latest paths mirror latest cycle                                   | `packages/qfai/tests/core/prototyping/evidenceRecord.test.ts`              |
| TC-0017-0012 | FullHarnessIteration type is no longer the active schema                     | `packages/qfai/tests/integration/spec0017Integration.test.ts`              |
| TC-0017-0013 | Mode invariant validator emits `QFAI-PROT-MODE-001`                          | `packages/qfai/tests/validators/prototyping/modeInvariant.test.ts`         |
| TC-0017-0014 | uiEvidenceArtifacts emits error in all modes on missing screenshot           | `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`               |
| TC-0017-0015 | reviewerGate emits error in all modes on non-PASS                            | `packages/qfai/tests/validators/prototyping/reviewerGate.test.ts`          |
| TC-0017-0016 | executionPlan validator applies to all modes                                 | `packages/qfai/tests/integration/prototypingSkillV1716Integration.test.ts` |
| TC-0017-0017 | bestOfHistory missing emits error in all modes                               | `packages/qfai/tests/integration/spec0017Integration.test.ts`              |
| TC-0017-0018 | breakthrough missing emits error in all modes                                | `packages/qfai/tests/integration/spec0017Integration.test.ts`              |
| TC-0017-0019 | evidenceRefs placeholder rejected                                            | `packages/qfai/tests/core/prototypingEvidence.negative.test.ts`            |
| TC-0017-0020 | Internal round-start artifact generation writes review bundle + command plan | `packages/qfai/tests/cli/prototyping.test.ts`                              |
| TC-0017-0021 | Internal round-start artifact generation exits 0 on success                  | `packages/qfai/tests/cli/prototyping.test.ts`                              |
| TC-0017-0022 | Internal round-start artifact generation does not capture screenshots        | `packages/qfai/tests/cli/prototyping.test.ts`                              |
| TC-0017-0023 | No playwright-mcp references remain in active repo surfaces                  | `packages/qfai/tests/assets/noLegacyReferences.test.ts`                    |
| TC-0017-0024 | No Node Playwright imports remain in production src                          | `packages/qfai/tests/assets/noLegacyReferences.test.ts`                    |
| TC-0017-0025 | Skill directories are byte-identical                                         | `packages/qfai/tests/assets/assets.test.ts`                                |
| TC-0017-0026 | capture-screenshots.js file does not exist                                   | `packages/qfai/tests/assets/noLegacyReferences.test.ts`                    |
| TC-0017-0027 | All three modes still validate under the same obligation set except budgets  | `packages/qfai/tests/integration/spec0017Integration.test.ts`              |
| TC-0017-0028 | `it.todo` / `test.todo` / `describe.todo` are detected                       | `packages/qfai/tests/validators/testTodoStubs.test.ts`                     |
| TC-0017-0029 | `forbidTestTodoStubs` opt-out bypasses detection                             | `packages/qfai/tests/validators/testTodoStubs.test.ts`                     |
| TC-0017-0030 | `validation.testStrategy.forbidTestTodoStubs` defaults to true               | `packages/qfai/tests/core/config.test.ts`                                  |
| TC-0017-0031 | `qfai init` ships `.github/workflows/qfai-validate.yml`                      | `packages/qfai/tests/cli/init.test.ts`                                     |
| TC-0017-0032 | `/qfai-implement` completion blocks on `QFAI-TEST-0001`                      | `packages/qfai/tests/skill/prototypingSkill*.test.ts`                      |

### Former spec-0018 test cases (absorbed)

Only the implementation-backed v2 cases are retained here. Draft-only cases
that were never implemented were intentionally dropped during consolidation.

| TC-ID        | Title                                                                | Location                                                                        |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| TC-0018-0001 | Candidate helpers validate IDs and dropped-at-round semantics        | `packages/qfai/tests/core/prototyping/candidateRound.test.ts`                   |
| TC-0018-0002 | Round helpers derive fixed-round transitions and artifact paths      | `packages/qfai/tests/core/prototyping/candidateRound.test.ts`                   |
| TC-0018-0003 | Candidate concept payloads remain first-class artifacts              | `packages/qfai/tests/core/prototyping/candidateRound.test.ts`                   |
| TC-0018-0004 | Evaluator review v2 computes regression alerts                       | `packages/qfai/tests/core/prototyping/evaluatorReviewV2.test.ts`                |
| TC-0018-0005 | Evaluator review v2 enforces at least 3 strengths                    | `packages/qfai/tests/core/prototyping/evaluatorReviewV2.test.ts`                |
| TC-0018-0006 | Harvest builder preserves harvested elements and next-round target   | `packages/qfai/tests/core/prototyping/harvestAbsorption.test.ts`                |
| TC-0018-0007 | Absorption builder pre-enumerates prior harvest IDs                  | `packages/qfai/tests/core/prototyping/harvestAbsorption.test.ts`                |
| TC-0018-0008 | Absorption builder rejects round mismatches and missing concept refs | `packages/qfai/tests/core/prototyping/harvestAbsorption.test.ts`                |
| TC-0018-0009 | Candidate Playwright plans use candidate-prefixed routes             | `packages/qfai/tests/core/prototyping/playwrightCliPlanV2.test.ts`              |
| TC-0018-0010 | Candidate Playwright plans flatten candidates × screens              | `packages/qfai/tests/core/prototyping/playwrightCliPlanV2.test.ts`              |
| TC-0018-0011 | Round review bundles include candidate concepts and prior refs       | `packages/qfai/tests/core/prototyping/reviewBundleV2.test.ts`                   |
| TC-0018-0012 | Round review bundles persist round-scoped artifacts                  | `packages/qfai/tests/core/prototyping/reviewBundleV2.test.ts`                   |
| TC-0018-0013 | Round evidence v2 records candidate-scoped refs                      | `packages/qfai/tests/core/prototyping/reimplementationEvidenceRecordV2.test.ts` |
| TC-0018-0014 | Prototyping evidence record v2 writes `schemaVersion: "2.0"`         | `packages/qfai/tests/core/prototyping/reimplementationEvidenceRecordV2.test.ts` |
| TC-0018-0015 | Internal round CLI parses and writes round artifacts                 | `packages/qfai/tests/cli/prototyping.test.ts`                                   |
| TC-0018-0016 | Report summarizes `rounds[]` / `polishCycles[]` as roundLifecycle    | `packages/qfai/tests/core/report.test.ts`                                       |
