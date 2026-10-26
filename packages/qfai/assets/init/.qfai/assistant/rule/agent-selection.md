---
id: agent-selection
category: project
update_frequency: occasional
---

# Agent Selection

Each card in `.qfai/assistant/agent/` defines one agent. Its frontmatter is the
source for its identity, mission, domain, artifacts, tools, permissions, and
specializations. Read the card before briefing the agent, and keep no other
copy of its definition.

## The catalogue

QFAI delegates by context, never by role. The session agent does every piece of
work itself and starts a sub-agent only for one of the two reasons
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#sub-agent-delegation-mandatory`
states. Each card serves one of them:

| Card                       | Kind     | Briefed for                                                                                                          |
| -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `fullstack-engineer`       | worker   | One of two or more units that pass the parallel-unit gate: a story with no implementation yet, or a read-only lookup |
| `requirements-reviewer`    | reviewer | The specification review, the finder of the concrete-abstract cycle, a griller                                       |
| `architecture-reviewer`    | reviewer | A contract change in the specification review, a griller on a contract or architecture choice                        |
| `implementation-reviewer`  | reviewer | The code review of the whole diff                                                                                    |
| `product-surface-reviewer` | reviewer | A screen change in a review, and the prototyping evaluator                                                           |

Inside a route, the plan's `review` and `common-review-cycle` pick the
reviewers. A skill run by name names its own reviewer in its body. No card is
defined by a technical domain, and no step or skill declares the agents it may
dispatch.

For MCP search and retrieval choices, see the MCP Integration section of
`.qfai/assistant/skill/web-research/SKILL.md`.
