---
id: agent-selection
category: project
update_frequency: occasional
---

# Agent Selection (Delegation playbook)

## Goal

Delegate work to specialized roles to reduce blind spots and improve quality.

## Default delegation map

- **Requirements Analyst**: clarify intent, scope, acceptance criteria, open questions
- **Planner**: plan phases, risks, gating, rollback strategy
- **Architect**: design, boundaries, compatibility considerations
- **Contract Designer**: contracts (UI/API: YAML, DB: SQL), IDs, indexing implications
- **QA Engineer**: risk-based checks, regression scope, quality gate review
- **Test Engineer**: scenario.feature and test scaffolding strategy
- **Front-end / Back-end Engineer**: implementation within repo conventions
- **DevOps/CI Engineer**: verify-pack/CI impacts
- **Code Reviewer**: style, maintainability, correctness

## If subagents are not supported

Emulate the delegation by doing role-by-role analysis in order:
Requirements → Plan → Design → Contracts → Tests → Implementation → Review → QA.
