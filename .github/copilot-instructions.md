# QFAI repository instructions (Copilot)

This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.

## ⚠️ packages/qfai/ と .qfai/ の区別（最重要）

本リポジトリは QFAI パッケージの開発リポジトリであると同時に、QFAI 自体を npm インストールして運用している。  
この2つを混同しないこと。

| ディレクトリ | 役割 | 修正対象か |
|---|---|---|
| `packages/qfai/` | **QFAI パッケージのソースコード**（実装・テスト・アセット） | ✅ パッケージ開発時の修正対象 |
| `.qfai/` | QFAI を npm インストールして運用した結果生成されるディレクトリ（specs, contracts, discussion, skills 等） | ⚠️ パッケージ改善目的では修正しない |

- Skill テンプレートやバリデータ等を改善する場合は `packages/qfai/` 配下を修正する。`.qfai/` 配下を直接編集してもパッケージには反映されない。

## Golden rules

- Always match the user's language in your outputs.
- Treat `.qfai/` as the canonical source of truth for the QFAI workflow:
  - Skills (SSOT): `.qfai/assistant/skills/`
  - Instructions: `.qfai/assistant/instructions/`
  - Project steering: `.qfai/assistant/steering/`
- When asked to perform QFAI workflow tasks, prefer using the QFAI skill symlinks in `.github/skills/`.
  - These symlinks resolve to `.qfai/assistant/skills/<skill-name>/`.
- Do not invent repository structure, tools, or frameworks. Inspect the repo first and align with what is already used.
- Keep changes minimal and targeted. Update tests and docs when behavior changes.
