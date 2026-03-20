# 12 OQ Resolution Log

## 解決ログ

| OQ-ID   | Title                                                  | 解決日     | 解決者 | 解決内容                                                                                                                                                                      | 採用オプション | 関連ソース          |
| ------- | ------------------------------------------------------ | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------- |
| OQ-0001 | Should evidence format be strict JSON or free-text?    | 2026-03-20 | agent  | v1.6.2 では自由文+明示ラベルを採用。厳格な JSON スキーマは将来バージョンに延期。SRC-0001 S6.2 に明記済み                                                                      | Option B       | SRC-0001 S6.2       |
| OQ-0002 | Should validator warnings be hard errors?              | 2026-03-20 | agent  | v1.6.2 ではバリデータ警告を非ブロッキング診断として実装。ハードエラー化は将来バージョンに延期。SRC-0001 S9 に明記済み                                                          | Option B       | SRC-0001 S9         |
| OQ-0003 | Should parallel dispatch require worktree isolation?   | 2026-03-20 | agent  | 並列ディスパッチにはワークツリーまたは明示的ブランチ分離を必須とする。設計ドキュメントの要件に従い Option A を採用                                                              | Option A       | SRC-0001 S7.1, S7.3 |
| OQ-0004 | Scope of wrapper updates - include .github?            | 2026-03-20 | agent  | .github の更新は qfai-implement への参照が存在する場合にのみ実施。無条件の更新は行わない。SRC-0001 S10.1 の「必要なら .github」に準拠                                           | Option B       | SRC-0001 S10.1      |
| OQ-0005 | Should sub-agent names appear in wrapper descriptions? | 2026-03-20 | agent  | ラッパーの説明にはサブエージェント名を含めず、振る舞い（watch-it-fail/pass、レビュアーゲート等）のみを記述する。内部実装の詳細を外部インターフェースから分離する方針を採用       | Option B       | SRC-0001 S8.1-8.2   |

## 解決統計

- 解決済み: 5
- 延期: 0
- 却下: 0
- オープン: 0
