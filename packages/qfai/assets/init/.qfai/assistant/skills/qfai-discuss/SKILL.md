<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-discuss
title: QFAI Discuss (Layered Spec Input Interview)
description: "Structure interviews so refinement can populate OBJ/INIT/CAP/FLOW with minimal ambiguity."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Researcher, Facilitator, Interviewer, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-discuss — Layered Spec Input Interview

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/discuss/README.md`
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Keep templates as source of truth; do not invent alternate sections.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT self-approve.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

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

- Delegate final completion gate to an independent Reviewer.
- Reviewer must check Drift Protocol compliance, required role delegation, and handoff readiness.
- Reviewer must validate alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals for risk triage.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- This skill optimizes interviews for layered Spec Pack inputs (OBJ/INIT/CAP/FLOW).
- Execute interviews in two stages:
  - Stage A: Core interview (mandatory)
  - Stage B: Optional deep dive (triggered)
- Output path:
  - `.qfai/discuss/DISCUSS-XXXX/`
- Required files:
  - `00_Summary.md`
  - `01_Objective.md`
  - `02_Initiative.md`
  - `03_Capabilities.md`
  - `04_Business-flow.md`
  - `05_Policy.md`
  - `06_Stakeholders.md`
  - `07_Open-questions.md`
- If user cannot answer, leave `TBD` and create/append an OQ in `07_Open-questions.md`.
- Do NOT write lower-layer IDs (`AC-*`, `BR-*`, `EX-*`, `TC-*`) in discuss artifacts.

## Goal

Build high-quality interview outputs that can be directly consumed by `/qfai-sdd` without re-discovery.

## Non-goals

- Directly editing `.qfai/specs/spec-*/**`.
- Creating acceptance tests or implementation plans.

## Mandatory Outputs

- `.qfai/discuss/DISCUSS-XXXX/00_Summary.md`
- `.qfai/discuss/DISCUSS-XXXX/01_Objective.md`
- `.qfai/discuss/DISCUSS-XXXX/02_Initiative.md`
- `.qfai/discuss/DISCUSS-XXXX/03_Capabilities.md`
- `.qfai/discuss/DISCUSS-XXXX/04_Business-flow.md`
- `.qfai/discuss/DISCUSS-XXXX/05_Policy.md`
- `.qfai/discuss/DISCUSS-XXXX/06_Stakeholders.md`
- `.qfai/discuss/DISCUSS-XXXX/07_Open-questions.md`
- Reviewer notes (`PASS` or `REVISE`).

## Core Interview Set (Mandatory)

Ask these first, one question at a time in `Question X/Y` format with 3 options + `recommend for me`:

1. Goal and product concept
   - What outcome defines success and for whom?
2. Current pain/gap
   - What fails today and why now?
3. Scope boundary
   - Explicit in-scope and out-of-scope for this iteration.
4. Major user/operation flow
   - Key steps and branching points.
5. Decision policy
   - Priority ordering (for example: safety > correctness > maintainability > speed).

## Optional Deep Dive (Conditional)

Trigger additional questions only when signals are present:

- Compliance/regulatory signals -> compliance and audit deep dive.
- External integrations -> API boundary deep dive.
- Migration/data backfill -> data consistency deep dive.
- High load/latency sensitivity -> performance deep dive.

Record trigger + rationale in `00_Summary.md`.

## Output Assembly Rules

- `00_Summary.md`: final summary, decisions, unresolved items.
- `01_Objective.md`: objective candidates (use `OBJ-CAND-XXXX` IDs only).
- `02_Initiative.md`: initiative candidates (use `INIT-CAND-XXXX` IDs only).
- `03_Capabilities.md`: capability candidates (use `CAP-CAND-XXXX` IDs only).
- `04_Business-flow.md`: flow narrative and step structure (use `FLOW-CAND-XXXX` IDs only).
- `05_Policy.md`: decision policy, tie-breaks, emergency override.
- `06_Stakeholders.md`: users/operators/approvers and responsibilities.
- `07_Open-questions.md`: unresolved blockers and non-blockers.

## Required Coverage Topics

Before completion, confirm all are covered:

1. Product concept and target users.
2. Scope boundary and anti-goals.
3. Non-functional expectations (NFR), including performance and security posture.
4. Operational constraints and ownership.
5. Decision policy priorities.

## SDD Handoff Rules

Discuss artifacts are inputs for refinement/planning, not spec outputs.

Recommended references for `/qfai-sdd`:

- discuss: `01_Objective.md`, `02_Initiative.md`, `03_Capabilities.md`, `04_Business-flow.md`, `05_Policy.md`
- require: `01_Functional-requirements.md`, `02_Non-functional-requirements.md`, `03_Contracts-boundary.md`, `04_Data-and-glossary.md`, `05_Test-policy.md`

## Completion Contract (Shared)

Before declaring completion, you MUST:

- resolve or explicitly defer all blockers with rationale.
- ensure all mandatory output files exist and are populated.
- scan outputs for placeholders (`TBD`, `TODO`, `???`, `OPEN QUESTION`) and route unresolved items to `07_Open-questions.md`.
- capture concrete evidence (commands, file paths, reviewer result).

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/discuss-DISCUSS-XXXX.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Core interview transcript summary
- Optional deep dive triggers and outcomes
- Decisions made (with rationale)
- Open questions ledger summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- generated discuss path (`.qfai/discuss/DISCUSS-XXXX/`)
- unresolved OQ count
- reviewer result
- ready-for-next command (`/qfai-require`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Core interview set completed.
- [ ] Optional deep dive ran only for triggered topics.
- [ ] All `TBD` items are mirrored in `07_Open-questions.md`.
- [ ] No lower-layer IDs (`AC/BR/EX/TC`) were written in discuss outputs.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] Core interview set is complete.
- [ ] Optional deep dive was executed only when triggered (or explicitly marked as not needed).
- [ ] Unresolved items were logged to `07_Open-questions.md`.
- [ ] Discuss deliverables `00..07` were produced.
- [ ] The fixed completion message for `/qfai-require` handoff was shown as the final line.

## Completion Message & Next Actions (MUST)

You MUST include the fixed sentence below, and it MUST be the final line of the user-facing output after the interview is complete.

- Fixed sentence (mandatory):
  質問が完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-require』と入力してください。

- Proceed (recommended): `/qfai-require`.
  Action: run it to convert interview outcomes into structured requirements.
- Additional requests exist:
  Action: provide the new requests, assumptions, and constraints as a bullet list.
- Interview needs correction: rerun `/qfai-discuss`.
  Action: add missing main flow, branch flow, and exception flow details before rerun.
