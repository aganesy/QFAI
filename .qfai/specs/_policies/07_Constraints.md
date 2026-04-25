# 07 Constraints

## Technical Constraints

| ID    | Constraint                                                                                                                                                                         | Rationale                               | Impact                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| TC-01 | Node.js >= 18.0.0                                                                                                                                                                  | current runtime baseline                | 実行環境の制約                                           |
| TC-02 | TypeScript validators は deterministic async 関数 `(root, config) => Promise<Issue[]>` に従う                                                                                      | validate repeatability                  | バリデータ実装の制約                                     |
| TC-03 | downstream execution skills は discussion pack を直接読まない                                                                                                                      | contract-first downstream を維持する    | `/qfai-sdd` 以降は specs + contracts only                |
| TC-04 | `/qfai-sdd` は discussion UIUX sidecar を `.qfai/contracts/design/**` と `.qfai/contracts/ui/**` に正規化する                                                                      | downstream truth source を固定する      | SDD preflight / generation の制約                        |
| TC-05 | repo-root `qfai validate` は contract-first validator 群を primary path にする                                                                                                     | current code posture に一致させる       | discussion direct-pack validation と分離                 |
| TC-06 | `runCanonicalUixValidators` は direct discussion-pack validation 専用                                                                                                              | latest discussion pack の暗黙解決を防ぐ | repo-root downstream validate では primary path にしない |
| TC-07 | declared screen ごとの screenshot / HTML snapshot は両方 mandatory                                                                                                                 | fail-closed evidence gate               | `QFAI-UIE-001/002` の blocking 条件                      |
| TC-08 | design contracts の canonical file set は `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `design-system.yaml` とする | exploration-first downstream を固定する | `QFAI-DCON-*` validator 対象                             |
| TC-09 | UI contracts は `.qfai/contracts/ui/*.yaml` を canonical set とする                                                                                                                | screen contract truth source を固定する | downstream evaluator / validator の入力制約              |
| TC-10 | `qfai prototyping` CLI と removed runtime/full-harness engine を public contract として再導入しない                                                                                | skill-first posture を維持する          | public interface の制約                                  |
| TC-11 | breakthrough trigger は `allReviewerAxesPerfect100`, score delta, diff lines を使う deterministic な機械判定とする                                                                 | 再現性と監査性を保つ                    | `.qfai/evidence/breakthrough.json` が必要                |
| TC-12 | design system は discussion 初期入力ではなく、prototyping の winner direction から抽出する                                                                                         | 早期収束を防ぐ                          | discussion / SDD / prototyping の責務分離                |

## Operational Constraints

| ID    | Constraint                                                                                                              | Rationale                        | Impact                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| OC-01 | `/qfai-prototyping` は唯一の public prototyping path とする                                                             | 誤用防止                         | CLI surface の単純化                     |
| OC-02 | `/qfai-verify` は `qfai validate --fail-on error` と review artifact を completion gate に含める                        | reviewer gate を必須化           | verify の制約                            |
| OC-03 | downstream validate は discussion artifact の存在で contract 欠落を代替してはならない                                   | fail-open 防止                   | contract 欠落は error                    |
| OC-04 | historical wording は `07_Decisions.md`, `09_delta.md`, `_policies/08_Decisions.md`, `_policies/10_delta.md` にのみ残す | active layer の誤読防止          | active 01..06/10 の整合制約              |
| OC-05 | prototyping は初期 funnel `5->3->2->1` と polish loop を持ち、停滞時は breakthrough branch 2 本を強制比較する           | exploration-first quality system | branch planner / plateau detector の制約 |

## Business Constraints

| ID    | Constraint                                                | Rationale           | Impact                          |
| ----- | --------------------------------------------------------- | ------------------- | ------------------------------- |
| BC-01 | drift recovery は upstream owner skill rerun を必須とする | SSOT 修正責任を保つ | downstream での場当たり修正禁止 |
| BC-02 | breaking changes は delta と migration expectation を伴う | ユーザー説明責任    | 文書管理の制約                  |

## Notes

- 旧 legacy evaluation contract / legacy winner-selection contract 前提は historical posture であり、current active constraint ではない。
- discussion-side validator 群は `/qfai-discussion` と `/qfai-sdd` preflight の品質保証に残る。
