<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-planning
title: QFAI SDD Planning (Plan Finalization)
description: "Finalize executable plans after refinement and keep plan artifacts synchronized."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, TestStrategist, QAEngineer, CodeReviewer]
mode: approval-gated

---

# /qfai-sdd-planning - Plan Finalization

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/skills/qfai-sdd/SKILL.md`
- Keep planning outputs synchronized with layered specs.

## Inputs Priority (Preflight)

Use this order before planning:

1. `.qfai/specs/_shared/**`
2. `.qfai/specs/spec-XXXX/01..05`
3. `.qfai/require/01_sources.md`, `.qfai/require/02_requirement-index.md`, `.qfai/require/03_open-questions.md` (context only)

If required shared/slice inputs are missing, stop planning and direct the user to `/qfai-sdd-refinement`.

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
- Reviewer must verify Drift Protocol compliance and test policy alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals used for risk review.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Planning assumes refinement has already produced shared/slice artifacts.
- If specs are missing or incomplete, do not fail silently; route to `/qfai-sdd-refinement`.
- `plan.md` and `spec-XXXX/06_Plan.md` must remain synchronized.
- Keep implementation steps actionable and testable.
- Do not modify upstream requirement index files in this skill.

## Goal

Create an executable implementation and verification plan grounded in finalized SDD artifacts.

## Non-goals

- Rebuilding shared/slice artifacts from scratch.
- Implementing production code.

## Mandatory Outputs

- `plan.md`
- `.qfai/specs/spec-XXXX/06_Plan.md`
- `.qfai/specs/spec-XXXX/09_delta.md` (or `*_delta.md`) updated when planning decisions change
- Evidence file: `.qfai/evidence/sdd-planning-<spec-id>.md`

## Required Process

1. Validate refinement prerequisites (`_shared/01..04`, `spec-XXXX/01..05`).
2. Build/update `plan.md` with implementation tasks, verification strategy, and risk handling.
3. Synchronize `spec-XXXX/06_Plan.md` with `plan.md`.
4. Update delta decisions if planning assumptions changed.
5. Request Reviewer gate and record result.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- confirm prerequisites were satisfied (or report explicit redirection);
- ensure `plan.md` and `06_Plan.md` are synchronized;
- capture unresolved plan-level risks as Open Questions;
- keep decision changes reflected in delta artifacts.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/sdd-planning-<spec-id>.md`

Required sections:

- Objective
- Preconditions check result
- Inputs reviewed (files/paths)
- Plan outputs summary
- Delta/decision updates
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- precondition check result
- updated plan artifact paths
- unresolved planning OQ count
- reviewer result
- ready-for-next command (`/qfai-prototyping`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Preconditions were checked before planning edits.
- [ ] `plan.md` and `spec-XXXX/06_Plan.md` are synchronized.
- [ ] Decision changes were recorded in delta files when needed.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-prototyping`.
  Action: implement contract-aligned skeletons from the finalized plan.
- Specs were missing for planning: `/qfai-sdd-refinement`.
  Action: run preflight and build required shared/slice artifacts first.
- Planning assumptions changed significantly: rerun `/qfai-sdd-planning`.
  Action: update plan/delta synchronization and reviewer evidence.
