# QFAI repository instructions (Copilot)

This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.

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
- Follow cross-AI rules in `.agents/rules/` (master). Notably:
  - `version-discipline.md` — branch name pins
    `packages/qfai/package.json#version`. On a pinned branch
    (`feature/vX.Y.Z`) the pin acts as the user's release authorization: sync
    `package.json`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`,
    re-insert an empty `## [Unreleased]`, and commit
    `chore(release): qfai X.Y.Z`. On an unpinned branch all of those edits
    require explicit instruction. Tag / publish / force-push / amend /
    AI-merge always require explicit instruction.
  - `distributed-surface.md`, `root-additions-policy.md`, `temporary-files.md`.
  - The universal entrypoint is `AGENTS.md` at the repo root.
