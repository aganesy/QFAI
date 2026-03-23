# 09 Constraints

## Technical Constraints

| ID   | Title                                    | Description                                                                                                            | Impact                                                               | Source            |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------- |
| TC-1 | Codex requires TOML format               | Codex のサブエージェント定義は TOML 形式のみサポート。Claude Code / Copilot のような Markdown symlink は使用できない。 | 39 ファイルを TOML として新規作成する必要がある                      | SRC-0002          |
| TC-2 | TOML files must be real files            | Codex の TOML パーサーは実ファイルを前提とする。symlink 経由の参照はサポートされない。                                 | canonical MD への symlink 戦略は不可。実ファイルとして内容を複製する | SRC-0002,SRC-0004 |
| TC-3 | Multi-line TOML string via triple quotes | `developer_instructions` は TOML の複数行文字列（`"""`）で記述する。改行・インデントを含む長文テキストを格納可能。     | canonical MD の構造を三重引用符内にマッピングする設計が必要          | SRC-0002          |

## Operational Constraints

| ID   | Title                             | Description                                                                                      | Impact                                                                     | Source   |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------- |
| OC-1 | Manual sync with canonical MD     | 39 TOML ファイルの `developer_instructions` は canonical MD の変更時に手動で同期する必要がある。 | canonical 更新のたびに TOML 側の追従作業が発生し、乖離リスクがある         | SRC-0005 |
| OC-2 | No automated sync in this release | init.ts による自動生成・同期は本リリース（v1.6.4）のスコープ外。将来リリースで対応予定。         | 当面は手動メンテナンスが前提。エージェント数が増えると運用コストが増大する | SRC-0001 |

## Rules

- 制約は実装判断に直接影響するものだけを記載する。
- 各制約には影響（Impact）と情報源（Source）を明記する。
