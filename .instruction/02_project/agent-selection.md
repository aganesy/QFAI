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

# エージェント選択ガイド（SuperClaude流の運用を取り込む）

本プロジェクトでは、タスクの種類/リスク/複雑さに応じて **最初に担当エージェントを明確化**し、必要に応じてサブエージェントを組み合わせて進める。

関連:

- SDD（フェーズ/成果物/品質ゲート）: `.instruction/02_project/spec-driven-development.md`
- MCP（一覧/使いどころ/注意点）: `.instruction/02_project/mcp.md`

## 1. 選び方（最短ルール）

1. **「いまの成果物は何か」**で選ぶ（要件/仕様/チケット/コード/テスト/レビュー）
2. 次に **「最大リスクは何か」**で補強する（セキュリティ/データ整合/性能/UX/運用）
3. **複数領域に跨る**なら `architect` を先頭に置く（分割・依存関係・影響分析の起点）

## 2. 代表シナリオ別：推奨エージェント

| 状況（例）                           | 主担当                 | 併用（例）                                                      | 推奨MCP（例）                                 |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| 要件が曖昧/前提が多い                | `requirements-analyst` | `architect`, `technical-writer`                                 | `markitdown`, `vibe-pdf-read`+`ocr`, `serena` |
| 仕様書を作る/修正する（SDD）         | `technical-writer`     | `requirements-analyst`, `architect`, `quality-lead`             | `markitdown`, `vibe-pdf-read`+`ocr`, `serena` |
| 仕様→チケット化（粒度/依存関係）     | `requirements-analyst` | `architect`, `unit-test-engineer`                               | `serena`                                      |
| 画面/UI実装                          | `frontend-developer`   | `requirements-analyst`, `integration-qa`                        | `serena`, `context7`, `chrome-devtools`       |
| API/Resolver実装                     | `backend-developer`    | `database-developer`, `security-analyst`, `unit-test-engineer`  | `serena`, `context7`                          |
| DB設計/権限/整合性                   | `database-developer`   | `backend-developer`, `security-analyst`, `performance-qa`       | `serena`, `context7`                          |
| 不具合調査/原因特定                  | `debug-specialist`     | 実装担当 + `integration-qa`                                     | `serena`, `chrome-devtools`                   |
| 結合/回帰/フロー検証                 | `integration-qa`       | `unit-test-engineer`, 実装担当                                  | `chrome-devtools`, `serena`                   |
| 性能課題の調査/改善                  | `performance-qa`       | `backend-developer`, `database-developer`, `frontend-developer` | `serena`, `chrome-devtools`                   |
| セキュリティ設計/対策検討            | `security-analyst`     | `backend-developer`                                             | `context7`, `serena`                          |
| セキュリティの最終レビュー           | `security-reviewer`    | `security-analyst`, `code-reviewer`                             | `serena`, `context7`                          |
| コードレビュー（変更後の最終確認）   | `code-reviewer`        | `quality-lead`, `security-reviewer`（高リスク時）               | `serena`, `context7`                          |
| 品質ゲート（依頼範囲内での厳密評価） | `quality-lead`         | `code-reviewer`, `integration-qa`                               | `serena`                                      |

## 3. 組み合わせパターン（定番）

- **SDD（要件→仕様→チケット）**: `requirements-analyst` → `technical-writer` → `architect`
- **実装（フロント中心）**: `frontend-developer` + `integration-qa` + `code-reviewer`
- **実装（バック中心）**: `backend-developer` + `database-developer` + `unit-test-engineer` + `security-analyst`
- **高リスク変更（権限/データ/外部入力）**: 主担当 + `security-reviewer` + `quality-lead`

## 4. 迷ったときの基準

- **影響範囲が読めない** → `architect`
- **要件が確定していない** → `requirements-analyst`
- **仕様/手順が散らかっている** → `technical-writer`
- **テストが不足している** → `unit-test-engineer`（必要なら `integration-qa`）
- **「安全に編集したい/参照追跡したい」** → まず `serena` を使う（詳細: `.instruction/02_project/mcp.md`）
