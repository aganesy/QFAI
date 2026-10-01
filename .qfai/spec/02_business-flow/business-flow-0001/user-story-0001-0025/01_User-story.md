# US-0001-0025: Agent symlink integration

## User Story

As an operator, I want `qfai init` to place `.claude/agents/<name>.md` and `.github/agents/<name>.agent.md` as file symlinks to `.qfai/assistant/agents/<name>.md` (`.qfai/assistant/agent/<name>.md` with the `rule/ skill/ agent/ prompt/` assistant tree) and to write no `README.md` into `.agents/`, `.codex/`, `.claude/agents/` or `.github/agents/`, so that every agent host reads one definition of each agent.

## Non-goals

- Converting agent definitions automatically
