# 06 Glossary

| Term                              | Meaning                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| discussion pack                   | `/qfai-discussion` が生成する upstream requirements/discovery artifact。`/qfai-sdd` の入力専用。                                                 |
| exploration-first                 | direction を discussion で固定せず、prototyping の探索・比較・収束で決める posture。                                                             |
| UIUX sidecar                      | discussion pack 配下の `uiux/*.md` 群。design intent の authoring artifact であり downstream execution truth ではない。                          |
| exploration brief contract        | `.qfai/contracts/design/exploration-brief.yaml`。探索条件、must-keep interactions、brand signals の SSOT。                                       |
| evaluation rubric contract        | `.qfai/contracts/design/evaluation-rubric.yaml`。design quality / originality / craft / functionality 等の評価軸 SSOT。                          |
| evaluator calibration contract    | `.qfai/contracts/design/evaluator-calibration.yaml`。good critique / blandness fail / originality fail 例の SSOT。                               |
| selected direction contract       | `.qfai/contracts/design/selected-direction.yaml`。winning direction と carry-forward rules の SSOT。                                             |
| design-system contract            | `.qfai/contracts/design/design-system.yaml`。winner から抽出された downstream design-system checklist の SSOT。                                  |
| breakthrough evidence             | `.qfai/evidence/breakthrough.json`。plateau detector 判定、trigger reasons、branch 実行証跡の SSOT。                                             |
| contract-first downstream         | `/qfai-sdd` 以降の skill / validate / verify が `specs + .qfai/contracts/**` を primary input とする posture。                                   |
| UI contract                       | `.qfai/contracts/ui/*.yaml`。declared screen / route / obligations の SSOT。                                                                     |
| direct discussion-pack validation | discussion pack root を明示的に入力して canonical UIX validators を回すこと。repo-root downstream validate と区別する。                          |
| best-of-history                   | 後続 iteration が常に最良とはみなさず、過去勝者を incumbent と比較し続ける運用。                                                                 |
| plateau detector                  | `allItemsPass95`, score delta, diff lines を使って breakthrough branch を機械判定で発火するロジック。                                            |
| mandatory UI evidence             | `.qfai/evidence/prototyping/screenshots/<screen-id>.png` と `.qfai/evidence/prototyping/html/<screen-id>.html`。declared screen ごとに両方必須。 |
| contract readiness                | design/ui contracts が downstream execution に必要な最小 schema を満たしている状態。                                                             |
| historical layer                  | `07_Decisions.md`, `09_delta.md`, `_policies/08_Decisions.md`, `_policies/10_delta.md`。superseded wording を残せる層。                          |
