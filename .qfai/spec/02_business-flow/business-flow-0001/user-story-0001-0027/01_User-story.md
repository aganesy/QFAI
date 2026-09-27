# US-0001-0027: Prune legacy wrappers

## User Story

As an operator, I want `qfai init --force` to prune the generated `.claude/commands/qfai-*.md` and `.github/prompts/qfai-*.prompt.md` wrappers and the old non-symlink `qfai-*` skill directories, so that stale wrappers do not linger beside the current ones.

## Non-goals

- Deleting files QFAI does not manage.
