# Claude Code Project Sub-agents (QFAI wrappers)

## これは何？
このディレクトリの `*.md` は、Claude Code の **Project Sub-agents** をリポジトリに同梱するための設定です。

ただし、本プロジェクトではサブエージェント定義の正本を `.qfai/assistant/agents/` に置きます。
ここにある各 `*.md` は、Claude Code から呼び出された際に **.qfai の role card を参照して従う**ことだけを強制する「薄いラッパー」です。

## 重要
- 役割の中身を変えるときは、まず `.qfai/assistant/agents/*.md` を更新してください。
- ここ（`.claude/agents`）は **参照先を示すだけ**に留め、重複実装を避けてください。
