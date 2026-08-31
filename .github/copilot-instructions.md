# QFAI repository instructions (Copilot)

This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.

## Golden rules

- Always match the user's language in your outputs.
- Treat `.qfai/` as the canonical source of truth for the QFAI workflow:
  - Skills (SSOT): `.qfai/assistant/skills/`
  - Foundational rules: `.qfai/assistant/constitution/` (post-recut)
  - Declarative manifests: `.qfai/assistant/manifest/`
  - Reference catalogs: `.qfai/assistant/catalog/`
  - Process / migration memos: `.qfai/assistant/process/`
  - AI work-log surface (per-project): `.qfai/steering/` (entry frontmatter schema: `.qfai/contracts/cli/worklog-entry.schema.md`)
- Legacy `.qfai/assistant/steering/` is read-compatible only during
  the deprecation window (`D-DEPRECATED-PATH` warning fires when it
  is detected). Run `qfai init --upgrade-assistant-tree` to migrate.
- When asked to perform QFAI workflow tasks, prefer using the QFAI skill symlinks in `.github/skills/`.
  - These symlinks resolve to `.qfai/assistant/skills/<skill-name>/`.
- Do not invent repository structure, tools, or frameworks. Inspect the repo first and align with what is already used.
- Keep changes minimal and targeted. Update tests and docs when behavior changes.

## Cross-AI rules (master)

The authoritative rule set shared across all AI coding agents (Claude
Code / Codex / Copilot) lives under `.agents/rules/`. Tool-specific
mirrors (`.claude/rules/`, etc.) reference these masters; the
`.agents/rules/` files are SSOT.

Key rules to follow:

- `.agents/rules/temporary-files.md` — temporary files MUST go under `tmp/`.
- `.agents/rules/root-additions-policy.md` — never add root-level files/dirs without explicit user approval.
- `.agents/rules/distributed-surface.md` — no internal QFAI IDs or version markers in shipped files.
- `.agents/rules/version-discipline.md` — release version numbers are the project maintainer's call; never select or bump one independently.
