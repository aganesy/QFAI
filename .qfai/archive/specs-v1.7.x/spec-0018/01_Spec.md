# 01 Spec

## Metadata

| Key    | Value                                                     |
| ------ | --------------------------------------------------------- |
| Spec   | spec-0018                                                 |
| Parent | CAP-0018                                                  |
| Title  | Codex サブエージェント実装 (Codex Sub-Agent TOML Support) |
| Status | draft                                                     |

## Summary

Codex プラットフォーム向けに、QFAI の 39 ロール特化サブエージェントを TOML 形式で実装する。Claude Code（Markdown symlink）および GitHub Copilot（Markdown symlink）と同等の機能を Codex 環境で提供する。

## Applicable NFR / Policy / Evidence Summary

- NFR-0001: TOML syntax validity — 全 39 ファイルがパースエラーなし
- NFR-0002: Content parity — developer_instructions がカノニカル MD と一致
- NFR-0003: Naming consistency — kebab-case ファイル名
- NFR-0006: config.toml validity — パースエラーなし
- Policy: sandbox_mode = "read-only" for review/analysis agents (DR-0029)
- Policy: Static placement, no init.ts changes (DR-0030)

## Escalation Hook

For cross-capability constraints, NFR applicability, or policy decisions that require shared-scope resolution, refer to `_policies/` (especially `07_Constraints.md`, `09_Open-questions.md`).

## Scope

### In Scope

- 39 `.codex/agents/*.toml` files
- 1 `.codex/config.toml`
- developer_instructions content conversion from canonical MD
- Role-based sandbox_mode classification

### Out of Scope

- 5 extra canonical agents not in Claude/Copilot
- init.ts auto-generation logic
- MCP server configuration
- AGENTS.md changes
