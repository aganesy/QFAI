---
category: claude-code
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# Claude Code Feature Notes

## TodoWrite (task management)

- Use it for complex tasks of three or more steps, or when the user makes several requests.
- States are `pending`, `in_progress` (one at a time) and `completed`. Close an item as soon as it is done.

## @import (for CLAUDE.md)

- `@path/to/file.md` pulls an external Markdown file into the context.
- Read `.instruction/00_universal/`, `01_specialties/`, `02_project/` and `03_ai-agents/claude-code/` as modules.

## Using Memory

- Collect frequently used procedures, patterns and error responses in CLAUDE.md and reuse them.

## Optimizing Tool Use

- Batch read-only commands (ls, read, grep) that can run together.
- Run only the tests and builds that are needed, and report the results concisely.
