<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-require
title: QFAI Require (Gap-Detection Interview)
description: "Convert discuss outputs into requirement artifacts with explicit NFR, boundary, glossary, and test policy coverage."
argument-hint: "<discuss-or-idea-input> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Facilitator, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-require — Requirement Gap Detection + Follow-up Interview

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/discuss/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Keep template ordering and section names stable.
- Legacy single-file `require/require.md` flow is compatibility-only.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator only creates work orders, delegates tasks, integrates outputs, and presents to the user.
- Orchestrator MUST NOT author the primary artifact first draft.
- Orchestrator MUST NOT self-approve.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, ask for explicit Simulation mode approval.
3. Without approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final gate to an independent Reviewer.
- Reviewer must verify Drift Protocol compliance, requirement testability, and gap closure.
- Reviewer must verify alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals for risk review.
- Continue only when Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Execute in two stages:
  - Stage A: Core requirement interview (mandatory)
  - Stage B: Optional deep dive (triggered)
- Output path:
  - `.qfai/require/REQUIRE-XXXX/`
- Required files:
  - `00_Summary.md`
  - `01_Functional-requirements.md`
  - `02_Non-functional-requirements.md`
  - `03_Contracts-boundary.md`
  - `04_Data-and-glossary.md`
  - `05_Test-policy.md`
  - `06_Compliance-and-risk.md`
  - `07_Open-questions.md`
- If user answer is unknown, keep `TBD` and add an item in `07_Open-questions.md`.
- Mandatory gap detection before completion:
  - NFR coverage is empty
  - API/DB/UI boundary is ambiguous
  - glossary has unresolved synonyms/polysemy
  - test-layer policy is missing

## Goal

Produce requirement artifacts that can feed layered Spec Pack generation without hidden assumptions.

## Non-goals

- Directly authoring `specs/spec-*/**`.
- Implementing code or tests.

## Mandatory Outputs

- `.qfai/require/REQUIRE-XXXX/00_Summary.md`
- `.qfai/require/REQUIRE-XXXX/01_Functional-requirements.md`
- `.qfai/require/REQUIRE-XXXX/02_Non-functional-requirements.md`
- `.qfai/require/REQUIRE-XXXX/03_Contracts-boundary.md`
- `.qfai/require/REQUIRE-XXXX/04_Data-and-glossary.md`
- `.qfai/require/REQUIRE-XXXX/05_Test-policy.md`
- `.qfai/require/REQUIRE-XXXX/06_Compliance-and-risk.md`
- `.qfai/require/REQUIRE-XXXX/07_Open-questions.md`
- Reviewer notes (`PASS` or `REVISE`).

## Core Interview Set (Mandatory)

Ask one by one in `Question X/Y` format with 3 options + `recommend for me`:

1. Functional scope
   - prioritized use-case list and explicit in/out scope.
2. Data and I/O
   - key entities, required inputs, expected outputs.
3. NFR baseline
   - performance, availability, security, auditability, operability.
4. Contract boundary
   - API/DB/UI ownership and SSOT boundaries.
5. Test policy
   - unit/integration/e2e strategy and layer tags.

## Optional Deep Dive (Conditional)

Trigger only when signals exist:

- Compliance/regulatory obligations -> legal/compliance deep dive.
- External integrations -> API contract deep dive.
- Migration/backfill -> data migration and consistency deep dive.
- High scale or tight latency -> performance/load test deep dive.

Record each trigger and result in `00_Summary.md` and `06_Compliance-and-risk.md`.

## Output Assembly Rules

- `00_Summary.md`: scope summary, decisions, unresolved items.
- `01_Functional-requirements.md`: functional requirements with acceptance signals.
- `02_Non-functional-requirements.md`: NFR baseline and measurable targets.
- `03_Contracts-boundary.md`: API/DB/UI boundaries and interface responsibilities.
- `04_Data-and-glossary.md`: entity definitions and glossary alignment.
- `05_Test-policy.md`: layer strategy, tag policy, and minimum coverage obligations.
- `06_Compliance-and-risk.md`: legal/risk/operational constraints and mitigations.
- `07_Open-questions.md`: unresolved or deferred items with owners and due dates.

## SDD Handoff Rules

Require outputs are input references for refinement/planning.

Recommended references for `/qfai-sdd`:

- discuss: `01_Objective.md`, `02_Initiative.md`, `03_Capabilities.md`, `04_Business-flow.md`, `05_Policy.md`
- require: `01_Functional-requirements.md`, `02_Non-functional-requirements.md`, `03_Contracts-boundary.md`, `04_Data-and-glossary.md`, `05_Test-policy.md`

## Completion Contract (Shared)

Before declaring completion, you MUST:

- close or explicitly defer all blocking OQ items.
- ensure all mandatory files exist and contain concrete content.
- scan outputs for placeholders (`TBD`, `TODO`, `???`, `OPEN QUESTION`) and register unresolved items in `07_Open-questions.md`.
- ensure each requirement has a testability signal.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/require-REQUIRE-XXXX.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Core interview transcript summary
- Optional deep dive triggers and outcomes
- Gap detection results
- Decisions made (with rationale)
- Open questions ledger summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- generated require path (`.qfai/require/REQUIRE-XXXX/`)
- unresolved OQ count
- reviewer result
- ready-for-next command (`/qfai-sdd`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Core interview set completed.
- [ ] Optional deep dive ran only for triggered topics.
- [ ] Gap detection checks were executed and recorded.
- [ ] All `TBD` items are mirrored in `07_Open-questions.md`.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill''s Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-sdd`.
  Action: generate the spec pack (`01..18`) from finalized requirements.
- Upstream assumptions need review: `/qfai-discuss`.
  Action: revisit unresolved business context and constraints first.
- Requirement details are incomplete: rerun `/qfai-require`.
  Action: add missing acceptance criteria, contracts, and OQ updates.

