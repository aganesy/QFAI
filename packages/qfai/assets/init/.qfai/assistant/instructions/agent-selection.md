---
id: agent-selection
category: project
update_frequency: occasional
---

# Agent Selection (Delegation playbook)

## Goal

Delegate work to specialized roles to reduce blind spots and improve quality.

## Feedback quality rule (all agents)

- Every sub-agent MUST include a concrete alternative or fix proposal when submitting FAIL verdicts or other negative feedback.
- Negative feedback without a concrete alternative is invalid and triggers re-judgment.

## Default delegation map

- **Researcher**: collect pre-knowledge (English sources), glossary, risks, and question angles
- **Orchestrator**: plan, delegate, integrate, and enforce stage gates (no direct implementation)
- **Test Volume Estimator**: compute ATDD floors and detect underestimation
- **OQ Harvester**: extract undefined/ambiguous decisions and draft question candidates
- **OQ Reviewer**: review OQ candidates for completeness, neutrality, and safe deferral
- **Option Explorer**: propose multiple solution options + trade-offs + recommendation for 09_delta.md
- **Option Reviewer**: review options for bias, missing alternatives, and unsafe deferrals
- **Requirements Analyst**: clarify intent, scope, acceptance criteria, open questions
- **Planner**: plan phases, risks, gating, rollback strategy
- **Architect**: design, boundaries, compatibility considerations
- **Contract Designer**: contracts (UI/API: YAML, DB: SQL), IDs, indexing implications
- **QA Engineer**: risk-based checks, regression scope, quality gate review
- **Test Engineer**: US/TC/CON-API obligations and test scaffolding strategy
- **ATDD Implementers**: E2E/API/Integration implementation per required coverage (`US` / `TC` / `CON-API`)
- **Front-end / Back-end Engineer**: implementation within repo conventions
- **UI/UX Reviewer**: layout sanity, interaction usability, and UI guardrail checks
- **DevOps/CI Engineer**: verify-pack/CI impacts
- **Code Reviewer**: style, maintainability, correctness
- **Reviewer**: non-edit completion audit (PASS/FAIL + rework list)
- **Runtime Gatekeeper**: runtime evidence and smoke verification
- **Prototyping Coverage Auditor**: detect missing spec rows and unresolved checks in prototyping coverage evidence
- **Doc Steward**: doc impact analysis and README/mermaid updates
- **Devil's Advocate (devils-advocate)**: challenge all assumptions as fundamentally wrong, provide concrete alternatives for every objection
  - Responsibility: review under the premise that everything is wrong; use nitpicking, reductio ad absurdum, and forced analogy to present a concrete vision of the ideal state
  - Delegation rule: executes after existing 10 reviewers (11th). FAIL must include alternative proposal. Bare negation FAIL is invalid. 3 consecutive FAILs trigger advisory demotion (current cycle only)
  - Selection scenario: mandatory in every skill review cycle (can_be_na: false). Purpose: uncover blind spots in design, specs, and requirements
- **Pattern Doubler (pattern-doubler)**: demand 2x the current ID-bearing pattern count, propose concrete additions with rationale
  - Responsibility: demand doubling of ID-bearing items (US, AC, BR, EX, TC) by identifying missing perspectives and proposing additions with justification
  - Delegation rule: executes after devils-advocate (12th). Rationale for each proposed addition is required
  - Selection scenario: executes in /qfai-sdd review cycles. N/A allowed only when spec pack has no ID-bearing items (can_be_na: true)

## If subagents are not supported

Emulate the delegation by doing role-by-role analysis in order:
Requirements → Plan → Design → Contracts → Tests → Implementation → Review → QA.
