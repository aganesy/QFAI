---
category: project
update-frequency: occasional
dependencies:
  - 02_project/spec-driven-development.md
  - 02_project/mcp.md
version: 3.0.0
---

# Agent Selection Guide (QFAI Toolkit)

Agent cards under `.qfai/assistant/agent/` define each agent. The session agent
does the work itself and starts a sub-agent only for the two reasons
`.qfai/assistant/rule/shared-skill-delegation-baseline.md` states: an
independent judgement, or parallel units that pass the parallel-unit gate.
`.qfai/assistant/rule/agent-selection.md` lists which card serves which.

> This file is a navigation guide. The delegation baseline, the plan's `review`
> and the skill being run decide who judges the work.

## The cards

| Card                       | Briefed for                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `fullstack-engineer`       | One of two or more units that pass the parallel-unit gate: an unbuilt story, or a read-only lookup |
| `requirements-reviewer`    | The specification review, the finder, a griller                                                    |
| `architecture-reviewer`    | A contract change in the specification review, a griller on a contract choice                      |
| `implementation-reviewer`  | The code review, and the review `/qfai-configure` names                                            |
| `product-surface-reviewer` | A screen change in a review, and the prototyping evaluator                                         |

## Applying the Principles

- The session agent and `fullstack-engineer` apply the viewpoints in `.github/instructions/principles.instructions.md` and `.instruction/00_universal/development-principles-checklist.md` as decision criteria while designing and implementing.
- Reviewers (`requirements-reviewer`, `implementation-reviewer`, `architecture-reviewer`, `product-surface-reviewer`) apply `.github/instructions/principles.instructions.md` and the code-review files beside it — `code-review.instructions.md`, `code-review-checklist.instructions.md`, `code-review-typescript.instructions.md` and `code-review-public-api.instructions.md` — as review viewpoints, and name the principle and the reason for the improvement when raising a finding.

For when to use MCP, see `.instruction/02_project/mcp.md`.
