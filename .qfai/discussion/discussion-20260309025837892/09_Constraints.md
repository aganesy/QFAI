# 09_Constraints

## Technical Constraints

| ID   | Constraint                                                               | Rationale                                              | Impact                                                            |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| TC-1 | 新規spec-0007〜0010はlayered spec構造（10ファイル/spec）に準拠する       | qfai validateがlayered spec構造を前提としているため    | spec作成時のファイル構成が固定                                    |
| TC-2 | IDフォーマットは既存規約に従う（CAP-XXXX, US-XXXX-XXXX, AC-XXXX-XXXX等） | qfai validateのID format validatorが検証するため       | 新規CAPはCAP-0007〜CAP-0010、USはUS-0007-XXXX〜US-0010-XXXX       |
| TC-3 | \_policies/の変更は追記のみ（既存内容の削除・書き換え禁止）              | Drift Protocolに準拠し、既存specへの影響を回避するため | 03_Capabilities.md, 04_Business-Flow.md, 06_Glossary.md等への追記 |
| TC-4 | Mermaid図は ` ```mermaid ` fencesのみ使用                                | qfai validateのMermaid validator要件                   | ` ```text ` や言語指定なしfenceは不可                             |
| TC-5 | spec-XXXX/01_Spec.mdにEscalation Hookを含める                            | Layered Spec Architecture規約（README.md）             | 各spec-0007〜0010の01_Spec.mdに\_policies参照を記載               |

## Operational Constraints

| ID   | Constraint                                                                  | Rationale                                          | Impact                                                                        |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| OC-1 | SKILL.md/agent定義ファイルはSSOTであり、specsはそれらの設計意図・制約の記録 | 二重管理による不整合を防止                         | specsは参照文書であり、SKILL.md変更時にspecsも更新が必要                      |
| OC-2 | qfai validate --fail-on errorでエラー0を維持                                | CI/CDパイプラインの合格条件                        | 新規specsは既存validatorルールに適合する必要がある                            |
| OC-3 | 新規CAPはCLIコマンドとして実装されない                                      | フレームワーク設計仕様であり、コマンド化は将来課題 | 06_Test-Cases.mdには構造検証テストを記載（E2E/Integration実装テストではない） |

## Legal / Compliance Constraints

| ID   | Constraint      | Regulation / Standard | Impact                           |
| ---- | --------------- | --------------------- | -------------------------------- |
| LC-1 | MIT license準拠 | MIT License           | 新規specファイルも同ライセンス下 |

## Budget Constraints

- Budget range: N/A（OSS、コストなし）
- Cost drivers: N/A

## Timeline Constraints

- Hard deadlines: なし（breaking changesはv2.0に延期済み）
- Milestones: 本discussionで方針確定 → /qfai-sddで一括生成
