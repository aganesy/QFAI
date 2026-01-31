---
id: agent-selection
category: project
update_frequency: occasional
---

# Agent Selection (Delegation playbook)

## Goal

Delegate work to specialized roles to reduce blind spots and improve quality.

## Default delegation map

- **Researcher**: collect pre-knowledge (English sources), glossary, risks, and question angles
- **OQ Harvester**: extract undefined/ambiguous decisions and draft question candidates
- **OQ Reviewer**: review OQ candidates for completeness, neutrality, and safe deferral
- **Option Explorer**: propose multiple solution options + trade-offs + recommendation for delta.md
- **Option Reviewer**: review options for bias, missing alternatives, and unsafe deferrals
- **Requirements Analyst**: clarify intent, scope, acceptance criteria, open questions
- **Planner**: plan phases, risks, gating, rollback strategy
- **Architect**: design, boundaries, compatibility considerations
- **Contract Designer**: contracts (UI/API: YAML, DB: SQL), IDs, indexing implications
- **QA Engineer**: risk-based checks, regression scope, quality gate review
- **Test Engineer**: scenario.feature and test scaffolding strategy
- **Front-end / Back-end Engineer**: implementation within repo conventions
- **UI/UX Reviewer**: layout sanity, interaction usability, and UI guardrail checks
- **DevOps/CI Engineer**: verify-pack/CI impacts
- **Code Reviewer**: style, maintainability, correctness

## If subagents are not supported

Emulate the delegation by doing role-by-role analysis in order:
Requirements → Plan → Design → Contracts → Tests → Implementation → Review → QA.
