---
category: project
update-frequency: occasional
dependencies:
  - 02_project/spec-driven-development.md
  - 02_project/mcp.md
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# エージェント選択ガイド（QFAI Toolkit）

タスクの性質に合わせて担当役割を選ぶ。QFAI は仕様書・検証・CLI の領域が明確なので、
**成果物の種類**で決めるのが最短。

## 代表シナリオ

| 状況                               | 主担当（例）         | 併用（例）                      |
| ---------------------------------- | -------------------- | ------------------------------- |
| 要件整理/仕様化                    | requirements-analyst | technical-writer, quality-lead  |
| Spec/Scenario/Contracts の整合確認 | technical-writer     | quality-lead                    |
| CLI/検証ロジックの実装             | backend-developer    | unit-test-engineer              |
| 仕様/コードレビュー                | code-reviewer        | security-reviewer（高リスク時） |
| リリース前の品質ゲート             | quality-lead         | code-reviewer                   |

## 迷ったときの基準

- 影響範囲が不明 → `architect`
- 仕様が曖昧 → `requirements-analyst`
- テストが薄い → `unit-test-engineer`
- 変更後の確認 → `code-reviewer`

MCP の使いどころは `.instruction/02_project/mcp.md` を参照する。
