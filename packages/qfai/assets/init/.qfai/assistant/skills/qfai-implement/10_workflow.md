<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

id: qfai-implement
title: QFAI Implement (Legacy TDD Green entrypoint)
description: "Legacy entrypoint for implementation; follow the TDD Green workflow (and refactor if needed)."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [BackendEngineer, FrontendEngineer, QAEngineer, RuntimeGatekeeper, CodeReviewer, DevOpsCIEngineer]
mode: iterative

---

# /qfai-implement - Implement Feature (Legacy Alias)

This prompt is a compatibility alias for `/qfai-tdd-green` (and `/qfai-tdd-refactor` when refactoring is required).
Follow the canonical prompts as the source of truth:

- `.qfai/assistant/skills/qfai-tdd-green/SKILL.md`
- `.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md`

## FORMAT SSOT (Mandatory)

- **Before writing or editing any `.qfai/**` artifact\*\*, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- **Do NOT copy** templates/samples into this prompt or into other prompt markdown.
- The generated artifacts must match the README-defined structure (headings, ordering, table columns).
- Completion requires a **Format Self-Check** in the evidence: list each artifact and confirm "matches README template".

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/delta.md` (Decision Records; if no spec yet, state "not applicable")
- P4: other artifacts (spec.md, scenario.feature, contracts, evidence)

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- This is a legacy entrypoint. You MUST follow `.qfai/assistant/skills/qfai-tdd-green/SKILL.md`.
- `implementation-brief.md` MUST exist before execution. If missing, STOP and run `/qfai-sdd-planning`.
- Do NOT write new tests here (use `/qfai-tdd-red` or `/qfai-unit-test`, and `/qfai-atdd` when needed).
- You MUST produce the required evidence file: `.qfai/evidence/tdd-green-<spec-id>.md`.
- If refactoring is required, run `/qfai-tdd-refactor` and record `.qfai/evidence/tdd-refactor-<spec-id>.md`.
- You MUST run the mandatory checks listed in the TDD Green prompt and record outcomes.
- Completion must be approved by a reviewer who did not implement the code.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Implement production code so RED tests pass and quality gates are green.

## Non-goals

- Writing new tests (use `/qfai-tdd-red` or `/qfai-atdd`).
- Re-implementing rejected options without a RE-OPEN decision.

## Mandatory Outputs

- Implementation changes that make tests pass
- Runtime evidence (as defined in the TDD Green prompt)
- Evidence files:
  - `.qfai/evidence/tdd-green-<spec-id>.md`
  - `.qfai/evidence/tdd-refactor-<spec-id>.md` (if refactor performed)
- Reviewer notes (PASS or rework list)

## Evidence (MANDATORY)

- Record build/test/runtime commands and results.
- Capture links or paths to changed code and runtime evidence.

## FINAL CHECKLIST (Check Last)

- [ ] Followed `.qfai/assistant/skills/qfai-tdd-green/SKILL.md` without omissions.
- [ ] Evidence files exist with command outputs.
- [ ] Reviewer approval recorded.
