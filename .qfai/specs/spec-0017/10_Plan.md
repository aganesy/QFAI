# 10 Plan

## Implementation phases (P0–P16, each = 1 commit)

各 phase は独立 PR / 1 commit。各 PR で **build green** を維持。各 phase 完了時に必ず緑のコミットを残す。

| Phase | Goal | Done criteria | Commit message |
|---|---|---|---|
| P0 | discussion pack working memory（gitignored） | `.qfai/discussion/discussion-prototyping-v2/` 一式 (skipped: plan IS the discussion record) | (no commit, working memory only) |
| **P1** | **本 spec-0017 作成 + _policies 整合** | `qfai validate` PASS（旧 prototyping profile 除外） | `feat(qfai): spec-0017 prototyping v2.0 redesign` |
| P2 | 削除 1/3: prototyping core (round/funnel/polish/branch/concept のコード+テスト+references) | grep ゼロ、build green | `feat(qfai)!: remove funnel/polish/branch/concept` |
| P3 | 削除 2/3: mode/full-harness | grep `low-cost\|standard\|full-harness\|maxCycles` ゼロ | `feat(qfai)!: remove mode and full-harness` |
| P4 | 削除 3/3: 上流契約 (rubric/calibration/absorption-policy/selected-direction) | grep ゼロ | `feat(qfai)!: remove rubric/calibration/absorption/selected-direction` |
| P5 | 新コア: iteration.ts / evaluatorReview.ts / certificate v2.0 / types v3.0 / evidenceRecord v3.0 | TDD 緑、shouldStop / cert v2.0 round-trip pass | `feat(qfai): iteration core types and certificate v2.0` |
| P6 | 新 CLI: prototypingIterate.ts + certify v2.0 + args.ts/main.ts | iterate / certify CLI 統合テスト緑 | `feat(qfai): prototyping iterate command and certify v2.0` |
| P7 | 新 validators: prototypingEvidenceV3 + 既存 validators v2.0 対応 | validate PASS for fixture | `feat(qfai): prototyping v2.0 validators (QFAI-PROT2-NNN)` |
| P8 | `/qfai-prototyping` skill 書換 | skill validator pass、SKILL.md ≤ 130 行 | `feat(qfai): /qfai-prototyping skill v2.0` |
| P9 | `/qfai-discussion` 改修 (33/34 削除、prototyping.yaml 簡素化) | discussion skill validator pass | `feat(qfai): /qfai-discussion v2.0 alignment` |
| P10 | `/qfai-sdd` 改修 (4 contract 削除、normalization reference 改訂) | sdd skill validator pass | `feat(qfai): /qfai-sdd v2.0 alignment` |
| P11 | `/qfai-implement` 改修 (handoff schema 整合、path 更新) | implement skill validator pass | `feat(qfai): /qfai-implement v2.0 alignment` |
| P12 | `/qfai-verify` 改修 (path 更新、full-harness 言及削除) | verify skill validator pass | `feat(qfai): /qfai-verify v2.0 alignment` |
| P13 | steering / instructions 整合 | grep `full-harness` ゼロ | `feat(qfai): steering and instructions v2.0 alignment` |
| P14 | E2E + sanity grep CI | E2E 緑、CI で fail-fast | `test(qfai): e2e prototyping v2 + sanity grep CI` |
| P15 | docs / migration | MIGRATION-2.0.md, README, CHANGELOG | `docs(qfai): MIGRATION-2.0 for prototyping redesign` |
| P16 | 実プロジェクト検証（手動、3 spec で full run） | `pivotDirective: pivot` 発火、視覚的差別化 | (manual, process record) |

## Phase 中の動作可能性

- P2–P7 期間: prototyping skill 動作不能（本 spec で許可）
- P8 完了時点: /qfai-prototyping は v2.0 で動作可能
- P9–P10 完了時点: 上流が整合
- P11–P12 完了時点: 下流が整合
- P13 完了時点: steering 整合
- P14 完了時点: CI が legacy 混入を防御
- P15–P16: docs と実証

## Sanity grep gate

`packages/qfai/scripts/check-no-legacy-concepts.sh` (P14 で CI 組込):

```bash
patterns=(
  "low-cost" "full-harness" "maxCycles" "maxIterationsByMode"
  "round-start" "round-harvest" "round-narrow" "round-absorb"
  "harvestBuilder" "absorptionBuilder" "reimplementationBuilder"
  "branchPlanner" "plateauDetector" "candidateConcept"
  "polishCycle" "bestOfHistory" "allReviewerAxesPerfect100"
  "conceptFit" "regressionAlert" "BreakthroughConfig"
  "evaluation-rubric" "evaluator-calibration" "absorption-policy"
  "selected-direction"
)
```

## Out of scope (本 spec)

- 旧 v1.x run の auto migration ツール作成
- per-project anti-slop curation workflow（global list で十分と判断）
- prototyping を non-UI spec に拡張
