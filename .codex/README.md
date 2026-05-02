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

## Cross-AI rules

Repository-wide AI rules live under `.agents/rules/` (master). Read
them — and the universal entrypoint `AGENTS.md` at the repo root —
before making non-trivial changes. The most consequential rule for
Codex sessions is `.agents/rules/version-discipline.md`: do not bump
`packages/qfai/package.json#version` or write `chore(release):`
commits unless the user has explicitly authorized a release.
