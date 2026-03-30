# 09_Constraints

## Constraint Table

| Type          | Constraint                                                                                                  | Impact                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Technical     | main validate path、discussion skill、template family、prototyping、browser QA、docs をまたぐ横断変更である | PR slicing と traceability が必要                  |
| Technical     | validator は deterministic に留め、semantic quality 判定を行わない                                          | review asset への責務分離が必要                    |
| Operational   | review roster 全件 PASS が discussion completion 条件                                                       | review pack 省略不可                               |
| Operational   | `qfai validate --fail-on error --format github` の証跡が必要                                                | `.qfai/report/validate.log` の更新が必要           |
| Compatibility | 旧 4-axis と weak schema を即 hard break しない                                                             | migration warning/guidance が必要                  |
| Release       | P0 と release-blocking P1 完了前に convergence release を名乗れない                                         | release claim を制限                               |
| Schedule      | v1.7.9 は correction/integration リリースであり scope 拡張を避ける                                          | full-harness default 化や science 最適化は後続送り |

## Assumptions

- 入力 2 文書は v1.7.9 discussion に必要な設計判断を十分に含む。
- 実コード実装は次フェーズで行い、本 pack はそれを曖昧さなく指示できる粒度を持つ。
