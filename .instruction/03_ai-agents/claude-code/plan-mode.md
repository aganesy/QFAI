---
category: claude-code
update-frequency: frequent
dependencies:
  [
    00_universal/thinking.md,
    00_universal/quality.md,
    03_ai-agents/claude-code/features.md,
  ]
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# Plan モード運用

Plan モード時は読み取り専用で調査・計画に徹する。

## 制約

- 禁止: 編集・書き込み系操作、コマンドでの変更。
- 許可: 読み取り（ls/read/grep）や Web 検索のみ。
- 実装が必要になったら ExitPlanMode で承認を得る。

## 調査フロー

1. プロジェクト構成と主要ディレクトリを把握。
2. 技術スタック・ビルド/テストコマンドを確認。
3. 既存の実装パターンとドメインルールを調査。
4. 要件の不明点を洗い出し、質問を作成。

## 計画の提示

- ステップを小さく分けた Plan を提示し、合意を得てから実装に移る。
- 役割に応じてサブエージェントの活用を検討し、タスク分割を明確にする。
