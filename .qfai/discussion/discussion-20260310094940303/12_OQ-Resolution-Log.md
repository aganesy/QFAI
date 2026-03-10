# 12_OQ-Resolution-Log

## Resolution Timeline

| Timestamp            | OQ-ID   | Action   | From | To       | Rationale                                                                                                                                    |
| -------------------- | ------- | -------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-10T09:49:40Z | OQ-0001 | resolved | open | resolved | 4列テーブル（ID/名称/説明/フェーズ）を採用。既存 10_Plan.md のモジュールテーブル形式と一貫性があり、6列は過剰。                              |
| 2026-03-10T09:49:40Z | OQ-0002 | resolved | open | resolved | セマンティックバージョニングを採用。業界標準であり、OC-02（内部契約）との矛盾はない（バージョンフィールド追加は breaking change ではない）。 |
| 2026-03-10T09:49:40Z | OQ-0003 | resolved | open | resolved | 静的辞書ファイル方式を採用。TC-04（ミニマル依存）制約に適合し、i18next は過剰。                                                              |
| 2026-03-10T09:49:40Z | OQ-0004 | resolved | open | resolved | RFC 2119 キーワードベース検出を採用。BR-0005-0001 の検出ソース定義と整合し、H2 限定では検出漏れリスクがある。                                |
| 2026-03-10T09:49:40Z | OQ-0005 | resolved | open | resolved | spec-0001 + spec-0002 への依存を明示。prototyping 証拠 JSON が validate と連携するため。                                                     |
| 2026-03-10T09:49:40Z | OQ-0006 | resolved | open | resolved | 10_Plan.md の「関連 spec」セクションのみに追加。01_Spec.md（Consumer View）は安定性のため変更しない。                                        |
| 2026-03-10T09:49:40Z | OQ-0007 | resolved | open | resolved | 10_Plan.md に2列テーブル（ルール名/TC-ID）を追加。実装者の視認性を優先。                                                                     |
