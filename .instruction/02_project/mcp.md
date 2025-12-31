---
category: project
update-frequency: frequent
dependencies:
  - 02_project/spec-driven-development.md
  - 02_project/development.md
  - 03_ai-agents/codex/best-practices.md
  - 03_ai-agents/copilot/best-practices.md
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# MCP（Model Context Protocol）運用ガイド

QFAI のドキュメント整備・実装・検証を効率化するための MCP 活用ポイントを整理する。

## 基本方針

- まず MCP で **既存の資料/コードを正確に読む**
- 解析や仕様化に使う入力には **機密情報を含めない**
- サーバの導入状況は環境依存のため `list/get` で確認する

## MCP サーバ一覧（代表例）

### `serena`（セマンティック検索/安全編集）

- 目的: 既存コード/ドキュメントの構造的検索と編集支援
- 典型ユースケース: `core/validators` の既存パターン探索、影響範囲の把握

### `context7`（公式ドキュメント参照）

- 目的: 依存ライブラリの公式 API を確認し、推測実装を避ける
- 典型ユースケース: `vitest` や `tsup` の設定/挙動確認

### `markitdown`（PDF/Office → Markdown）

- 目的: 要件資料の取り込み（`.qfai/require` の入力準備）
- 典型ユースケース: 仕様化の前段として要件を Markdown 化

### `vibe-pdf-read`（PDF → 画像） + `ocr`（画像 → 文字）

- 目的: スキャン PDF の読み取り
- 典型ユースケース: `markitdown` が効かない要件資料の OCR

### `chrome-devtools`（ブラウザ実行時情報）

- 目的: UI/ドキュメントの表示確認（必要時のみ）

## 代表レシピ

### レシピA: 要件資料 → `.qfai/require` へ取り込み

1. テキスト PDF なら `markitdown` で Markdown 化
2. スキャン PDF なら `vibe-pdf-read` → `ocr` で文字起こし
3. `.qfai/require/` に保存し、Spec 作成の入力にする

### レシピB: 影響範囲調査は Serena を起点にする

- 既存 validator / parser の参照関係を把握し、変更範囲を限定する

### レシピC: 依存ライブラリの仕様確認は Context7 を使う

- tsup/vitest/yaml などの挙動は公式ドキュメントで確認する
