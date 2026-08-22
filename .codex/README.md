# QFAI Codex skills

This directory provides Codex skill symlinks for QFAI.

## Canonical entrypoint

Skill symlinks point to QFAI's canonical skill documents under:

- .qfai/assistant/skills/

These canonical skill documents are the SSOT.
Tool integrations must reference `.qfai/assistant/skills/`.

## Usage

In Codex CLI, select a skill by name (e.g., `qfai-configure`) and provide your request.
All outputs must match the user's language.

## Cross-AI rules (master)

The authoritative rule set shared across all AI coding agents (Claude
Code / Codex / Copilot) lives under `.agents/rules/`. These files are
SSOT; tool-specific mirrors reference them.

Key rules:

- `.agents/rules/temporary-files.md` — temporary files MUST go under `tmp/`.
- `.agents/rules/root-additions-policy.md` — never add root-level files/dirs without explicit user approval.
- `.agents/rules/distributed-surface.md` — no internal QFAI IDs or version markers in shipped files.
- `.agents/rules/version-discipline.md` — release version numbers are the project maintainer's call; never select or bump one independently.
