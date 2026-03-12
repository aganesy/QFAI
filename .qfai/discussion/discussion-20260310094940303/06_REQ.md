# 06_REQ - Functional Requirements

## Requirements Register

| REQ-ID   | Title                                          | GAP-Ref | Target Spec          | Target File          | Description                                                                                                                                                   | Priority |
| -------- | ---------------------------------------------- | ------- | -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| REQ-0001 | バリデータ一覧テーブル追加                     | GAP-01  | spec-0002            | 10_Plan.md           | 33+ バリデータを ID、名称、説明、フェーズ（full/atdd/tdd/refinement）の4列テーブルで列挙する。既存 AC/BR と突合し、漏れがないことを確認する。                 | must     |
| REQ-0002 | validate.json スキーマバージョンフィールド追加 | GAP-02  | spec-0003            | 10_Plan.md           | validate.json のルートに `schemaVersion` フィールドを追加し、セマンティックバージョニング（例: "1.0.0"）を採用する方針を記述する。                            | could    |
| REQ-0003 | i18n 実装方式の明示                            | GAP-03  | spec-0004            | 10_Plan.md           | 日本語メッセージ対応の実装方式（静的辞書ファイル + フォールバック英語）を記述する。ライブラリ選定は実装フェーズに委ねるが、アーキテクチャ方針は明示する。     | could    |
| REQ-0004 | ガードレール解析フォーマット定義               | GAP-04  | spec-0005            | 04_Business-Rules.md | ガードレール定義の検出対象フォーマット（Markdown H2 見出し配下のテーブル行、またはキーワードベースの検出ルール）を BR の Notes 列に明示する。                 | should   |
| REQ-0005 | spec-0006 依存関係セクション追加               | GAP-05  | spec-0006            | 10_Plan.md           | 「依存関係」セクションを追加し、spec-0001（ディレクトリ構造）、spec-0002（validate.json スキーマ）への依存を明記する。                                        | could    |
| REQ-0006 | Skill↔Agent 双方向参照追加                     | GAP-06  | spec-0007, spec-0008 | 10_Plan.md           | spec-0007 の 10_Plan.md に「spec-0008 参照」を追加し、spec-0008 側にも「spec-0007 参照」があることを確認する。双方の「関連 spec」セクションで互いを明示する。 | could    |
| REQ-0007 | バリデーションルール→TC マッピング追加         | GAP-07  | spec-0009            | 10_Plan.md           | L-struct バリデーションルール（E_POLICIES_UPPER_TO_LOWER_REF 等）と対応する TC-ID のマッピングテーブルを 10_Plan.md に追加する。                              | could    |

## Priority Legend

- `must`: 必須。今回のスコープで満たす前提。
- `should`: 重要だが、詳細度や実装時期は調整余地あり。
- `could`: あると望ましい改善・補足。
