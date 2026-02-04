<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-scenario-test
title: QFAI Scenario Test (Legacy ATDD entrypoint)
description: "Legacy entrypoint for ATDD scenario tests; follow the ATDD workflow."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Orchestrator, TestEngineer, QAEngineer, CodeReviewer, DevOpsCIEngineer]
mode: execution-focused

---

# /qfai-scenario-test - Implement Scenario Tests (Legacy Alias)

This prompt is a compatibility alias for `/qfai-atdd`.
Follow the canonical ATDD prompt as the source of truth:

- `.qfai/assistant/prompts/qfai-atdd.md`

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

- This is a legacy entrypoint. You MUST follow `.qfai/assistant/prompts/qfai-atdd.md`.
- Do NOT declare completion based on unit/component tests.
- You MUST produce the required evidence file: `.qfai/evidence/atdd-<spec-id>.md`.
- You MUST run the mandatory checks listed in the ATDD prompt and record outcomes.
- Completion must be approved by a reviewer who did not implement the tests.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Turn `.qfai/specs/spec-XXXX/scenario.feature` into runnable acceptance tests (ATDD).

## Non-goals

- Unit and component tests (use `/qfai-tdd-red` or `/qfai-unit-test`).
- Product changes beyond what is required to make tests runnable.

## Mandatory Outputs

- Implemented acceptance tests
- Evidence file: `.qfai/evidence/atdd-<spec-id>.md`
- Reviewer notes (PASS or rework list)

## Evidence (MANDATORY)

- Record test commands and results.
- Capture links or paths to the acceptance test files and coverage ledger (if applicable).

## FINAL CHECKLIST (Check Last)

- [ ] Followed `.qfai/assistant/prompts/qfai-atdd.md` without omissions.
- [ ] Evidence file exists with command outputs.
- [ ] Reviewer approval recorded.
