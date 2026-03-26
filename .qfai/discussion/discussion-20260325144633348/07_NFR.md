# 07_NFR

## Categories

| Category        | Description                                                |
| --------------- | ---------------------------------------------------------- |
| performance     | render capture / validation の実行時間と追加オーバーヘッド |
| compatibility   | 既存 pack との後方互換性                                   |
| resilience      | Playwright 不可や baseUrl 不達時の耐性                     |
| usability       | エラーメッセージと報告の具体性                             |
| maintainability | テスト容易性と実装の分割性                                 |
| operability     | ドキュメント・証跡・PR 運用の一貫性                        |
| security        | render evidence の取り扱いに伴う情報露出防止               |

## Requirements

| NFR-ID   | Category               | Title                                       | Target                                                                                                                                 | Measurement                                                    | Source                       | Priority |
| -------- | ---------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------- | -------- |
| NFR-0001 | performance            | 非 render path の追加コストは小さい         | `--render-evidence` 未指定時の追加オーバーヘッドは 150ms 以下、既に生成済みの render bundle 検証は 800ms 以下を目安とする。            | 代表的な pack で timing 比較を行う。                           | SRC-0001, SRC-0002, SRC-0004 | must     |
| NFR-0002 | compatibility          | legacy pack と markdown-only 互換を維持する | 非 UI pack と markdown-only critique pack は v1.7.1 で新しい issue を増やさない。                                                      | 既存 fixture の回帰テストで新規 error / warning が出ないこと。 | SRC-0001, SRC-0002, SRC-0008 | must     |
| NFR-0003 | resilience             | capture 不可時に壊れない                    | Playwright 未導入、browser 起動失敗、baseUrl unreachable のいずれでも pack 生成は継続し、render entry は skipped/failed で記録される。 | 失敗注入テストで process crash がなく、理由が記録されること。  | SRC-0001, SRC-0004           | must     |
| NFR-0004 | usability              | エラーは即修正可能である                    | 各 error は route、viewport、欠落項目、修正の起点を含み、単なる `missing` では終わらない。                                             | 文言レビューで 3 要素以上を満たすこと。                        | SRC-0001, SRC-0004, SRC-0005 | must     |
| NFR-0005 | maintainability        | 新規ロジックは十分にテストされる            | 新規 helper / validator / report 分岐は、成功・失敗・互換・退避の各パスを unit で持つ。                                                | vitest と coverage レポート。                                  | SRC-0001, SRC-0002, SRC-0004 | must     |
| NFR-0006 | operability / security | 証跡は軽量で漏らさない                      | markdown と JSON にはファイルパスと最小限のメタデータのみを残し、画像バイナリや HTML 本文、秘密情報を本文に埋め込まない。              | 生成物レビューで base64 / raw HTML / secret の混入がないこと。 | SRC-0001, SRC-0004, SRC-0006 | must     |

## Work Orders Summary

| Step | Role (sub-agent) | Task title      | Input (refs)                         | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | --------------- | ------------------------------------ | ------------- | -------------------- |
| 1    | worker           | NFR first draft | design memo, README 群               | `07_NFR.md`   | PASS                 |
| 2    | orchestrator     | NFR integration | worker draft, discussion constraints | `07_NFR.md`   | PASS                 |
