# 06 Glossary

| Term                              | Meaning                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| discussion pack                   | `/qfai-discussion` が生成する upstream requirements/discovery artifact。`/qfai-sdd` の入力専用。                                                 |
| UIUX sidecar                      | discussion pack 配下の `uiux/*.md` 群。design intent の authoring artifact であり downstream execution truth ではない。                          |
| contract-first downstream         | `/qfai-sdd` 以降の skill / validate / verify が `specs + .qfai/contracts/**` のみを読む posture。                                                |
| design-system contract            | `.qfai/contracts/design/design-system.yaml`。downstream design-system checklist の SSOT。                                                        |
| evaluation-axes contract          | `.qfai/contracts/design/evaluation-axes.yaml`。invariant / trend-derived / product-specific / aggregate rules の SSOT。                          |
| anchor-selection contract         | `.qfai/contracts/design/anchor-selection.yaml`。selected anchor と comparison outcome の SSOT。                                                  |
| UI contract                       | `.qfai/contracts/ui/*.yaml`。declared screen / route / obligations の SSOT。                                                                     |
| direct discussion-pack validation | discussion pack root を明示的に入力して canonical UIX validators を回すこと。repo-root downstream validate と区別する。                          |
| L1 / L2 / L3                      | `/qfai-prototyping` の評価レイヤ。L1 は implementation fidelity、L2 は product experience、L3 は reviewer/verify gate。                          |
| mandatory UI evidence             | `.qfai/evidence/prototyping/screenshots/<screen-id>.png` と `.qfai/evidence/prototyping/html/<screen-id>.html`。declared screen ごとに両方必須。 |
| contract readiness                | design/ui contracts が downstream execution に必要な最小 schema を満たしている状態。                                                             |
| historical layer                  | `07_Decisions.md`, `09_delta.md`, `_policies/08_Decisions.md`, `_policies/10_delta.md`。superseded wording を残せる層。                          |
