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
- Follow cross-AI rules in `.agents/rules/` (master). Notably: `version-discipline.md` (no unilateral version bumps; branch name pins `packages/qfai/package.json#version`), `distributed-surface.md`, `root-additions-policy.md`, `temporary-files.md`. The universal entrypoint is `AGENTS.md` at the repo root.
