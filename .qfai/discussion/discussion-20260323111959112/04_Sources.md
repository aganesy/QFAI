# 04 Sources

## Source Registry

| SRC-ID   | Title                                 | Type     | URL / Path                                           | Retrieved  | Notes                           |
| -------- | ------------------------------------- | -------- | ---------------------------------------------------- | ---------- | ------------------------------- |
| SRC-0001 | Codex Sub-Agent Research              | primary  | (session-internal: verbal/non-committed input)       | 2026-03-23 | User-provided research input; not committed to repo |
| SRC-0002 | OpenAI Codex Sub-agents Documentation | external | https://developers.openai.com/codex/subagents        | 2026-03-23 | Official Codex sub-agent docs   |
| SRC-0003 | OpenAI Codex Config Basics            | external | https://developers.openai.com/codex/config-basic     | 2026-03-23 | config.toml documentation       |
| SRC-0004 | OpenAI Codex AGENTS.md Guide          | external | https://developers.openai.com/codex/guides/agents-md | 2026-03-23 | AGENTS.md usage guide           |
| SRC-0005 | QFAI Canonical Agents                 | primary  | .qfai/assistant/agents/\*.md                         | 2026-03-23 | 44 canonical agent definitions  |
| SRC-0006 | QFAI Claude Code Agents               | primary  | .claude/agents/\*.md                                 | 2026-03-23 | 39 Claude Code agent symlinks   |
| SRC-0007 | QFAI GitHub Copilot Agents            | primary  | .github/agents/\*.agent.md                           | 2026-03-23 | 39 Copilot agent symlinks       |
| SRC-0008 | QFAI Review Roster                    | primary  | .qfai/assistant/steering/review-roster.yml           | 2026-03-23 | Reviewer role definitions       |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
