---
category: project
update-frequency: occasional
dependencies: [00_universal/*, 02_project/mcp.md]
version: 2.0.0
---

# Orchestrator Operations Guide (QFAI Toolkit)

This guide defines how work is divided and merged when sub-agents are used.

## Basic Policy

- Delegate only when the roles can be clearly separated (requirements, implementation, testing and so on)
- Do not over-split tasks where the specification and implementation are tightly coupled
- Always share the plan and keep progress up to date
- Prefer MCP for investigation and editing (list: `.instruction/02_project/mcp.md`)

## Workflow

1. **Assess the situation**: clarify the goal, constraints and completion criteria, and identify the target files
2. **Plan**: assign an owner to each phase and make dependencies explicit
3. **Execute and integrate**: merge the changes and check tests and consistency
4. **Report**: share the summary of changes, impact, tests and remaining risks

## Notes

- Consistency between the specification documents and the code comes first
- Do not treat work as complete until the tests pass
- Do not guess about unknowns; ask early
