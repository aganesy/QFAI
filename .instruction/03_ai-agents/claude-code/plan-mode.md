---
category: claude-code
update-frequency: frequent
dependencies:
  [00_universal/thinking.md, 00_universal/quality.md, 03_ai-agents/claude-code/features.md]
version: 1.0.0
---

# Plan Mode Operations

In Plan mode, stay read-only and limit the work to investigation and planning.

## Constraints

- Prohibited: edit and write operations, and changes made through commands.
- Allowed: reads (ls, read, grep) and web search only.
- When implementation becomes necessary, get approval through ExitPlanMode.

## Investigation Flow

1. Understand the project layout and the main directories.
2. Check the technology stack and the build and test commands.
3. Investigate the existing implementation patterns and domain rules.
4. List the unclear points in the requirements and draft questions.

## Presenting the Plan

- Present a plan split into small steps and move to implementation after agreement.
- Consider using sub-agents according to their roles, and make the task split explicit.
