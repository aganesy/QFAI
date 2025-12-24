---
category: claude-code
update-frequency: occasional
dependencies: none
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# Claude Code 機能メモ

## TodoWrite（タスク管理）

- 3ステップ以上の複雑タスクや、ユーザーから依頼が複数あるときに使用。
- 状態は `pending` / `in_progress`（同時1件）/ `completed`。完了したら即クローズ。

## @import（CLAUDE.md 用）

- `@path/to/file.md` で外部 Markdown を取り込みコンテキスト化できる。
- `.instruction/00_universal/`, `01_specialties/`, `02_project/`, `03_ai-agents/claude-code/` をモジュール化して読む。

## メモリ活用

- 頻繁に参照する手順・パターン・エラー対応を CLAUDE.md に集約して再利用する。

## ツール実行の最適化

- まとめて実行できる読み取り系コマンド（ls/read/grep）はバッチ化する。
- テストやビルドは必要なものだけを選び、結果を簡潔に報告する。
