# 02 User Stories

4 items.

## US-0017-0001: code-review instructions placement

**As a** QFAI ユーザー
**I want** `qfai init` 実行時に `.github/instructions/code-review.instructions.md` が自動配置される
**So that** GitHub Copilot の PR レビューが構造化された指示に基づいて行われる

- REQ Refs: REQ-0001, REQ-0004, REQ-0006, REQ-0007

## US-0017-0002: principles instructions placement

**As a** QFAI ユーザー
**I want** `qfai init` 実行時に `.github/instructions/principles.instructions.md` が自動配置される
**So that** Copilot レビューがソフトウェア設計原則に基づく検証を行う

- REQ Refs: REQ-0002, REQ-0004, REQ-0006, REQ-0007

## US-0017-0003: Existing instructions protection

**As a** 既存プロジェクトの QFAI ユーザー
**I want** `qfai init` が既存の `.github/instructions/` ファイルを上書きしない
**So that** 独自にカスタマイズした instructions が保護される

- REQ Refs: REQ-0003

## US-0017-0004: Init report display

**As a** QFAI ユーザー
**I want** `qfai init` の実行結果レポートに instructions の created/skipped が表示される
**So that** 何が配置されたか明確に把握できる

- REQ Refs: REQ-0005, REQ-0008
