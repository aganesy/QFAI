# US-0001-0024: Symlink-based skill integration

## User Story

As an operator, I want `qfai init` to create directory symlinks in `.claude/skills/`, `.agents/skills/`, `.codex/skills/` and `.github/skills/` that point at `.qfai/assistant/skills/qfai-*` (`.qfai/assistant/skill/qfai-*` with the `rule/ skill/ agent/ prompt/` assistant tree), so that every agent host reads the same skills.

## Non-goals

- Symlinking skills that QFAI does not manage
