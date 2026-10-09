# US-0001-0043: Canonical assistant-tree layers

## User Story

As a release manager, I want `qfai validate` to enforce that `.qfai/assistant/` holds only the layers `rule/`, `skill/`, `step/`, `agent/` and `prompt/`, plus the project's own `skill.local/`, so that a directory outside the layers is caught mechanically.
