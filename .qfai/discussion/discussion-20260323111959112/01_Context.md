# 01 Context

## Metadata

| Key           | Value                              |
| ------------- | ---------------------------------- |
| Discussion ID | discussion-20260323111959112       |
| Date          | 2026-03-23                         |
| Owner         | user                               |
| Source         | v1.6.4 feature request             |

## Goal and Completion Criteria

- Goal: Define requirements for implementing all 39 QFAI sub-agents as Codex TOML files
- Measurable completion criteria:
  - 39 `.codex/agents/*.toml` files defined
  - `.codex/config.toml` defined
  - Content parity with Claude Code / GitHub Copilot agents verified
  - sandbox_mode strategy for each agent role defined

## Stakeholders

- Primary stakeholders: QFAI developers, Codex users
- Secondary stakeholders: QFAI maintainers, CI/CD pipeline

## Background

- Business context: Codex has officially released sub-agent support. QFAI needs feature parity across all three AI coding platforms (Claude Code, GitHub Copilot, Codex).
- Technical context: Codex uses TOML for agent definitions (not Markdown like Claude/Copilot). Canonical agent definitions exist in `.qfai/assistant/agents/*.md`. These need to be converted to TOML format.
- Historical context: QFAI v1.5.x added Claude Code and GitHub Copilot agent support via symlinks to canonical markdown files. Codex requires a different approach due to TOML format.

## Inputs

- Existing repository facts: 44 canonical agents in `.qfai/assistant/agents/`, 39 currently symlinked to Claude/Copilot
- External references: OpenAI Codex sub-agent documentation, user research file at `C:\Users\YusukeSenaga\Downloads\codex_subagent_reviewer_setup.md`
- Assumptions: Codex TOML format is stable and won't change significantly in near term

## Key Issues

- Issue 1: TOML format requires individual real files, not symlinks — maintenance burden when canonical agents change
- Issue 2: `developer_instructions` in TOML must faithfully represent the mission, inputs, deliverables, stop conditions, and checklist from canonical markdown
- Issue 3: sandbox_mode classification must align with agent role responsibilities
