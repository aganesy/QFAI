<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-unit-test
title: QFAI Unit Test (Legacy TDD Red entrypoint)
description: "Legacy entrypoint for unit/component tests; follow the TDD Red workflow."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [UnitTestScopeEnforcer, TestEngineer, QAEngineer, CodeReviewer]
mode: test-first

---

# /qfai-unit-test - Implement Unit Tests (Legacy Alias)

This prompt is a compatibility alias for `/qfai-tdd-red`.
Follow the canonical TDD Red prompt as the source of truth:

- `.qfai/assistant/skills/qfai-tdd-red/SKILL.md`

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

## Stage 0 — Steering completion refresh (mandatory)

Before moving forward in this stage, refresh these files:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

Rules:

- Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, stale facts).
- Fill what is verifiable from repository evidence (tree, docs, require/spec artifacts, package.json, CI definitions).
- If something cannot be verified, record it as an Open Question and ask the user.
- Even if steering is already complete, update it when new facts are discovered in this stage.
## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- This is a legacy entrypoint. You MUST follow `.qfai/assistant/skills/qfai-tdd-red/SKILL.md`.
- `implementation-brief.md` MUST exist before execution. If missing, STOP and run `/qfai-sdd-planning`.
- You MUST implement tests only. Do NOT implement production logic.
- You MUST produce the required evidence file: `.qfai/evidence/tdd-red-<spec-id>.md`.
- You MUST run the mandatory checks listed in the TDD Red prompt and record outcomes.
- Completion must be approved by a reviewer who did not implement the tests.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Implement fast unit/component tests that enforce the spec and provide reproducible RED evidence.

## Non-goals

- Production code changes beyond testability shims.
- Acceptance/E2E tests (use `/qfai-atdd`).

## Mandatory Outputs

- Unit/Component tests (RED)
- Evidence file: `.qfai/evidence/tdd-red-<spec-id>.md`
- Reviewer notes (PASS or rework list)

## Evidence (MANDATORY)

- Record test commands and results.
- Capture links or paths to unit test files and coverage artifacts (if applicable).

## FINAL CHECKLIST (Check Last)

- [ ] Followed `.qfai/assistant/skills/qfai-tdd-red/SKILL.md` without omissions.
- [ ] Evidence file exists with command outputs.
- [ ] Reviewer approval recorded.


