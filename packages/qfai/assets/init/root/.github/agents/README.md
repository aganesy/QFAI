# GitHub Copilot Custom Agents (QFAI wrappers)

## これは何？
このディレクトリの `*.agent.md` は、GitHub Copilot の **Custom Agents** をリポジトリに同梱するための設定です。

ただし、本プロジェクトではサブエージェント定義の正本を `.qfai/assistant/agents/` に置きます。
ここにある各 `*.agent.md` は、Copilot から呼び出された際に **.qfai の role card を参照して従う**ことだけを強制する「薄いラッパー」です。

## 重要
- 役割の中身を変えるときは、まず `.qfai/assistant/agents/*.md` を更新してください。
- ここ（`.github/agents`）は **参照先を示すだけ**に留め、重複実装を避けてください。
