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
2. `.qfai/specs/spec-XXXX/01..06`
3. `.qfai/require/require-*/01_Sources.md`, `.qfai/require/require-*/03_REQ.md`, `.qfai/require/require-*/08_OQ.md` (context only)

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
- Keep `specs/` definition-only and keep operational status records in `.qfai/status/*.json`.
- `plan.md` and `spec-XXXX/10_Plan.md` must remain synchronized.
- Keep implementation steps actionable and testable.
- Do not modify upstream requirement index files in this skill.
- Planning review must verify BR/Examples/Test-cases depth:
  - BR decomposes AC into decision-level rules.
  - Examples concretize BR.
  - Test-cases realize Examples.
  - Sparse counts require documented reason and completion plan.
- If diagrams are written in planning artifacts, Mermaid syntax must be inside ` ```mermaid ` fences only.

## Goal

Create an executable implementation and verification plan grounded in finalized SDD artifacts.

## Non-goals

- Rebuilding shared/slice artifacts from scratch.
- Implementing production code.

## Mandatory Outputs

- `plan.md`
- `.qfai/specs/spec-XXXX/10_Plan.md`
- `.qfai/specs/spec-XXXX/09_delta.md` (or `*_delta.md`) updated when planning decisions change
- review artifacts under `.qfai/review/review-<timestamp>/`
- Evidence file: `.qfai/evidence/sdd-planning-<spec-id>.md`

## Required Process

1. Validate refinement prerequisites (`_shared/01..04`, `spec-XXXX/01..06`).
2. Build/update `plan.md` with implementation tasks, verification strategy, and risk handling.
3. Synchronize `spec-XXXX/10_Plan.md` with `plan.md`.
4. Update delta decisions if planning assumptions changed.
5. Request Reviewer gate and record result.

## Review Gate Artifacts (RCP)

Create planning review artifacts at:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

RCP rules:

- Append-only: create a new `review-<timestamp>` directory for each review cycle.
- `summary.json` must satisfy the minimum schema (`version`, `created_at`, `target`, `roster`, `overall_status`).
- Keep `R\\d+_*.md` reviewer files at least one.
- Use templates from `.qfai/assistant/skills/qfai-sdd-planning/templates/review/`.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- confirm prerequisites were satisfied (or report explicit redirection);
- ensure `plan.md` and `10_Plan.md` are synchronized;
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
- [ ] `plan.md` and `spec-XXXX/10_Plan.md` are synchronized.
- [ ] specs remain definition-only and status fields are not mixed into specs.
- [ ] BR/Examples/Test-cases depth and sparse-case rationale are reviewable.
- [ ] Mermaid fence rules were satisfied when diagrams were used.
- [ ] `_shared/04_Business-flow.md` includes at least one Mermaid diagram.
- [ ] Every Scenario in `05_Examples.feature` includes `# Parent:`.
- [ ] Decision changes were recorded in delta files when needed.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Diagram artifacts follow Mermaid fence rules (if diagrams were used).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Review Cycle Checklist (MUST)

- [ ] Review artifacts were generated for the planning layer gate.
- [ ] All required reviewers completed their reviews for each review pack.
- [ ] Any feedback triggered return/fix and a new review pack was appended.
- [ ] `summary.json` satisfies the minimum schema.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-prototyping`.
  Action: implement contract-aligned skeletons from the finalized plan.
- Specs were missing for planning: `/qfai-sdd-refinement`.
  Action: run preflight and build required shared/slice artifacts first.
- Planning assumptions changed significantly: rerun `/qfai-sdd-planning`.
  Action: update plan/delta synchronization and reviewer evidence.
