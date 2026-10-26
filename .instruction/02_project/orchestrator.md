---
category: project
update-frequency: occasional
dependencies: [00_universal/*, 02_project/mcp.md]
version: 2.0.0
---

# Orchestrator Operations Guide (QFAI Toolkit)

This guide defines how the session agent divides and merges work, and when it starts a sub-agent.

## Basic Policy

- Do the work in the session agent. Delegate only for the two reasons `.qfai/assistant/rule/shared-skill-delegation-baseline.md` states: an independent judgement, or parallel units that pass the parallel-unit gate
- Never split work by role or technical area; work that shares the conversation stays in the session agent
- Always share the plan and keep progress up to date
- Prefer MCP for investigation and editing (list: `.instruction/02_project/mcp.md`)

## Workflow

1. **Assess the situation**: clarify the goal, constraints and completion criteria, and identify the target files
2. **Plan**: order the steps and make dependencies explicit
3. **Execute and integrate**: merge the changes and check tests and consistency
4. **Report**: share the summary of changes, impact, tests and remaining risks

## Notes

- Consistency between the specification documents and the code comes first
- Do not treat work as complete until the tests pass
- Do not guess about unknowns; ask early
