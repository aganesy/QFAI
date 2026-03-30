# 09 Constraints

## Technical Constraints

| ID   | Constraint | Rationale | Impact |
| ---- | ---------- | --------- | ------ |
| TC-1 | git diff使用はオプショナル（必須ではない） | git不在環境（no-git, shallow clone）での動作保証が必要（DR-0006） | Source B/C/Dフォールバック必須 |
| TC-2 | TypeScript strict mode + NodeNext modules | 既存コードベースの規約に準拠（tsconfig.base.json） | noUncheckedIndexedAccess, exactOptionalPropertyTypes 対応必須 |
| TC-3 | ESLint strict設定 | @typescript-eslint/no-unused-vars: error, no-console: error | 全コードがlint通過必須 |
| TC-4 | Vitest テストフレームワーク | 既存テスト基盤との整合性 | 新規モジュールにもVitest使用 |
| TC-5 | 後方互換性必須 | 既存evidenceファイル、validate出力との互換性維持 | Diff Contextセクション不在でもエラーにしない |
| TC-6 | child_process依存の制限 | git CLIコマンド実行にはchild_processを使用するが、タイムアウトとエラーハンドリング必須 | 非同期実行 + エラー時フォールバック |
| TC-7 | Traceability Ledger依存 | `16_Traceability-ledger.md` が存在するspecのみトレーサビリティチェック対象 | Ledger不在specはwarning（error不可） |

## Operational Constraints

| ID   | Constraint | Rationale | Impact |
| ---- | ---------- | --------- | ------ |
| OC-1 | 既存validate出力への影響最小化 | 下流ツール・CIが既存のvalidate出力フォーマットに依存 | 新チェック項目は既存フォーマットに準拠して追加 |
| OC-2 | SKILL.md改修は全エージェント共通で有効 | Claude Code / Copilot / Codex 全環境で同一SKILL.mdを使用 | エージェント固有の記述は含めない |

## Legal / Compliance Constraints

| ID   | Constraint | Regulation / Standard | Impact |
| ---- | ---------- | --------------------- | ------ |
| LC-1 | なし | - | - |

## Budget Constraints

- Budget range: 追加依存パッケージなし（既存エコシステム内で実装）
- Cost drivers: 開発工数のみ

## Timeline Constraints

- Hard deadlines: なし
- Milestones: spec-0011の既存仕様を土台として段階実装
