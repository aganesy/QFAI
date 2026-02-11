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
[DRIFT-PROTOCOL:MANDATORY]
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

## Sub-agent Delegation (MANDATORY)

This section is mandatory and overrides any conflicting fallback text in this file.

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results to the user.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT serve as Reviewer or skip delegation for convenience.

### Capability Probe (MUST)

1. Run one harmless Probe Task (for example: "reply with ok") once at stage start.
2. If subagents are unavailable, explicitly ask the user for Simulation mode approval.
3. Without explicit approval, stop the stage and do not continue.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- When used, record both of the following in outputs/evidence:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

### Work Orders Summary (MANDATORY evidence)

Every major artifact in this stage MUST include a `## Work Orders Summary` section with this fixed table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

- `Output (refs)` must point to in-file anchors or relative evidence file paths.

### Stage Minimum Roles (MUST)

- Delegate: TestWriter, EdgeCaseAnalyst create first drafts of unit test drafts and edge-case notes.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - Required roles were delegated (no orchestrator self-authoring).
  - DoD satisfied (coverage ledger, gates, evidence, DR-IDs).
  - **Drift Protocol enforced**:
    - No upstream artifact edits were made without an explicit user-approved Change Request.
    - If upstream changes exist, the correct owner skill was re-run after approval; downstream did not patch upstream directly.
  - **Test-layer policy enforced**:
    - E2E/API/Integration coverage aligns with `steering/test-layers.md` and the project’s plan.
    - Do not use pyramid ratios as a gate; use floors/ratios only as signals. Coverage obligations are the gate.
- Do not declare DONE or handoff until Reviewer returns `PASS`.


### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol (no upstream edits without user approval + CR)
- must: verify plan/test-layer adherence (`steering/test-layers.md` + plan)
- must: check Coverage Ledger is 100% unless approved exception
- must_not: accept test-volume ratios/floors as a hard gate
- must_not: accept upstream edits made directly by downstream phase
Output format:
- <headings / bullet schema>
Quality bar:
- PASS if ...
- REVISE if ...
```

### Reviewer response template

```text
Result: PASS | REVISE
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```

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
- `plan.md` is the primary How SSOT for execution phases.
- If only legacy `implementation-brief.md` exists, continue with warning and create a migration task to `plan.md`.
- If both `plan.md` and legacy `implementation-brief.md` are missing, STOP and run `/qfai-sdd-planning`.
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
