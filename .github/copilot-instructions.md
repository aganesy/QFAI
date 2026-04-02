# QFAI repository instructions (Copilot)

This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.

## Golden rules

- Always match the user's language in your outputs.
- Treat `.qfai/assistant/` as the canonical source of truth for the QFAI workflow:
  - Skills (SSOT): `.qfai/assistant/skills/`
  - Instructions: `.qfai/assistant/instructions/`
  - Project steering: `.qfai/assistant/steering/`
  - Note: `.qfai/{report,evidence,discussion,review}` are generated output — do not edit manually.
- When asked to perform QFAI workflow tasks, prefer using the QFAI skill symlinks in `.github/skills/`.
  - These symlinks resolve to `.qfai/assistant/skills/<skill-name>/`.
- Do not invent repository structure, tools, or frameworks. Inspect the repo first and align with what is already used.
- `packages/qfai/` is the QFAI package source (edit here for package improvements); `.qfai/` is generated runtime output (do not edit for package changes). See `AGENTS.md` for details.
- Keep changes minimal and targeted. Update tests and docs when behavior changes.
