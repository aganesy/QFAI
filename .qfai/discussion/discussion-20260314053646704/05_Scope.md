# 05 Scope

## スコープ内（In-Scope）

| ID     | 項目                                                                        | 優先度 |
| ------ | --------------------------------------------------------------------------- | ------ |
| SC-001 | `constitution.md` に Article X（AskUserQuestion MUST ルール）を追加         | 必須   |
| SC-002 | `communication.md` に AskUserQuestion 使用義務セクションを追加              | 必須   |
| SC-003 | `qfai-discussion/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂   | 必須   |
| SC-004 | `qfai-sdd/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂          | 必須   |
| SC-005 | `qfai-atdd/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂         | 必須   |
| SC-006 | `qfai-configure/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂    | 必須   |
| SC-007 | `qfai-prototyping/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂  | 必須   |
| SC-008 | `qfai-tdd-green/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂    | 必須   |
| SC-009 | `qfai-tdd-red/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂      | 必須   |
| SC-010 | `qfai-tdd-refactor/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂 | 必須   |
| SC-011 | `qfai-verify/SKILL.md` の AskUserQuestion Protocol 文言を MUST に改訂       | 必須   |
| SC-012 | `_policies/10_delta.md` に本変更の採用エントリを追加                        | 必須   |
| SC-013 | フォールバック手順（AskUserQuestion 非対応環境での対応）の明示的定義        | 必須   |
| SC-014 | `--auto` フラグとの整合性ルールの明記                                       | 必須   |

## スコープ外（Out-of-Scope）

| 項目                                      | 理由                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| TypeScript コードの変更                   | SKILL.md のみの改修で対応可能                                           |
| AskUserQuestion ツール自体の実装変更      | QFAI の管轄外（VS Code Copilot Chat 側の機能）                          |
| 新スキルの追加                            | 本変更の目的と無関係                                                    |
| 既存 Article I〜IX の内容変更             | 既存ルールは維持し Article X として追加する                             |
| `_policies/06_Glossary.md` の大規模改訂   | 用語定義の MUST 反映等の軽微な更新は SC-012 の波及として許容            |
| spec-XXXX の新規作成・大規模構造変更      | 既存 spec の用語・参照更新は \_policies 改訂に伴う波及として許容        |

## 成功基準

| ID      | 基準                                                                 | 計測方法                   |
| ------- | -------------------------------------------------------------------- | -------------------------- |
| KPI-001 | constitution.md に Article X が追加されていること                    | ファイル確認               |
| KPI-002 | communication.md に AskUserQuestion セクションが追加されていること   | ファイル確認               |
| KPI-003 | 全 9 SKILL.md の Protocol セクションが MUST 表現に改訂されていること | ファイル確認（9 ファイル） |
| KPI-004 | \_policies/10_delta.md に採用エントリが追加されていること            | ファイル確認               |
| KPI-005 | `qfai validate --fail-on error` が error=0 で完了すること            | CI 実行                    |
| KPI-006 | フォールバック手順が全ファイルで一貫して定義されていること           | 文言レビュー               |
