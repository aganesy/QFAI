---
name: requirements-analyst
description: "QFAI sub-agent wrapper (project-level). Canonical role card lives under .qfai/assistant/agents/."
model: inherit
---

# QFAI Sub-agent (Wrapper)

## 目的

このファイルは **Claude Code Project Sub-agent**（`.claude/agents/`）向けの「薄いラッパー」です。

本リポジトリでは、サブエージェントの正本（Single Source of Truth）は `.qfai/assistant/agents/*.md` にあります。
このサブエージェントが呼び出されたら、**必ず最初に**以下を読んで、その指示に従ってください。

- `.qfai/assistant/agents/README.md`
- `.qfai/assistant/agents/requirements-analyst.md`

## 運用ルール（最重要）

- 役割定義・応答フォーマット・禁止事項は、上記の `.qfai` 配下の role card を **優先**します。
- このファイルに書かれた内容と `.qfai` の内容が矛盾する場合、**`.qfai` を正**とします。
- `.qfai` を読まずに推測で進めないでください。

## 実行指示（最小）

1. `.qfai/assistant/agents/requirements-analyst.md` を読み、期待されるアウトプット形式で回答する
2. `.qfai/assistant/steering/*.md` と `.qfai/assistant/instructions/*.md` を前提として扱う
3. 不明点は Open Questions として列挙し、確定事項と混ぜない
