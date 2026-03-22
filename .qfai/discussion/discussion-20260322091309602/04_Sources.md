# 04_Sources

## ソーストレーサビリティ

| SRC-ID | タイトル | 種別 | パス / URL | 備考 |
|---|---|---|---|---|
| SRC-0001 | Copilot コードレビュー指示（現行） | ファイル | `.github/instructions/code-review.instructions.md` | TypeScript 固有チェックを含む。汎用化のベース |
| SRC-0002 | 設計原則レビュー指示（現行） | ファイル | `.github/instructions/principles.instructions.md` | 日本語。言語非依存。ほぼそのまま配布可能 |
| SRC-0003 | init コマンド実装 | ファイル | `packages/qfai/src/cli/commands/init.ts` | syncIntegrationWrappers が .github/ 生成の中核 |
| SRC-0004 | init テストスイート | ファイル | `packages/qfai/tests/cli/init.test.ts` | 既存テストパターンの参考 |
| SRC-0005 | fs ヘルパー | ファイル | `packages/qfai/src/cli/lib/fs.ts` | copyTemplateTree / copyTemplatePaths |
| SRC-0006 | copilot-instructions.md 生成 | 関数 | `init.ts:buildCopilotInstructions()` | 現行の .github/ ファイル生成パターン |
| SRC-0007 | ユーザーインタビュー | 対話 | 2026-03-22 ディスカッション | スコープ・汎用化・安全策の決定 |
| SRC-0008 | GitHub Copilot Instructions 仕様 | 外部 | GitHub Docs | frontmatter format: applyTo, excludeAgent |
| SRC-0009 | Copilot Review Workflow | ファイル | `.github/workflows/copilot-review.yml` | 参考（配布対象外） |
| SRC-0010 | PR テンプレート | ファイル | `.github/PULL_REQUEST_TEMPLATE.md` | 参考（配布対象外） |
