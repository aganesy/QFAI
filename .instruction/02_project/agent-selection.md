---
category: project
update-frequency: occasional
dependencies:
  - 02_project/spec-driven-development.md
  - 02_project/mcp.md
version: 2.0.0
---

# Agent Selection Guide (QFAI Toolkit)

Agent cards under `.qfai/assistant/agent/` define each agent. Routing and
review profiles come from the files in `packages/qfai/assets/defaults/agent-routing/`
and `packages/qfai/assets/defaults/review-profiles.yml`, with project overrides
in `qfai.config.yaml`. QFAI reads these source files directly: the root's `qfai`
dependency is a workspace link to `packages/qfai`, not a separate installed copy.
Select agents by artifact and phase.

> This file is a navigation guide. The agent cards, resolved routing and
> review profiles decide mandatory agents and reruns.

## Core Principles

- The coordinator is always `orchestrator`
- Planning goes to `delivery-planner`
- Requirements, open questions and options go to `requirements-analyst`
- Technical structure and contracts go to `solution-architect`
- UX, visual design, information architecture and transitions go to `product-experience-architect`
- The final completion decision goes to `completion-reviewer`
- The validate, coverage, runtime and prototyping gates go to `qa-gatekeeper`

## Typical Scenarios

| Situation                                   | Lead                           | With                                                  |
| ------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| Initial problem framing and issue discovery | `discovery-analyst`            | `delivery-planner`                                    |
| Requirements and specification              | `requirements-analyst`         | `solution-architect`, `product-experience-architect`  |
| Structure and contract design               | `solution-architect`           | `delivery-planner`                                    |
| UI/UX direction and DDP                     | `product-experience-architect` | `requirements-analyst`                                |
| Frontend implementation                     | `frontend-engineer`            | `implementation-reviewer`, `product-surface-reviewer` |
| Backend implementation                      | `backend-engineer`             | `implementation-reviewer`                             |
| Acceptance test implementation              | `acceptance-test-engineer`     | `test-design-analyst`, `qa-strategist`                |
| Test design and coverage                    | `test-design-analyst`          | `qa-strategist`                                       |
| Quality gate execution                      | `devops-ci-engineer`           | `qa-gatekeeper`, `completion-reviewer`                |
| Documentation sync                          | `doc-steward`                  | `delivery-planner`                                    |

## Choosing a Reviewer

- Completion contract, DoD and drift audit: `completion-reviewer`
- Validity of requirements, open questions and options: `requirements-reviewer`
- Validity of structure, contracts and boundaries: `architecture-reviewer`
- Implementation quality, maintainability and backend safety: `implementation-reviewer`
- UI implementation, UX and design consistency: `product-surface-reviewer`
- validate / coverage / runtime / prototyping gate: `qa-gatekeeper`

## Applying the Principles

- Implementers (`frontend-engineer`, `backend-engineer`) apply the viewpoints in `.github/instructions/principles.instructions.md` and `.instruction/00_universal/development-principles-checklist.md` as decision criteria during implementation.
- Designers (`solution-architect`, `product-experience-architect`) apply the same principles as design criteria for structure, contracts and UX direction.
- Reviewers (`implementation-reviewer`, `architecture-reviewer`, `product-surface-reviewer`) apply `.github/instructions/principles.instructions.md` and the code-review files beside it — `code-review.instructions.md`, `code-review-checklist.instructions.md`, `code-review-typescript.instructions.md` and `code-review-public-api.instructions.md` — as review viewpoints, and name the principle and the reason for the improvement when raising a finding.

## When in Doubt

- Unclear where to start: `delivery-planner`
- Unclear what to build: `requirements-analyst`
- Unclear how to build it: `solution-architect`
- Experience quality is the issue: `product-experience-architect`
- Checking that an implementation is correct: `implementation-reviewer`
- Checking whether the work may be closed: `completion-reviewer`

For when to use MCP, see `.instruction/02_project/mcp.md`.
