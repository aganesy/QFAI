<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-refinement
title: QFAI SDD Refinement (Preflight + Shared/Slice Bootstrapping)
description: "Run SDD preflight and produce shared/slice artifacts from specs-first, require-indexed, import-lite, or interview-start inputs."
argument-hint: "<spec-id-or-topic> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, RequirementsAnalyst, SpecWriter, TraceabilityBuilder, QAEngineer]
mode: approval-gated

---

# /qfai-sdd-refinement - Preflight + Shared/Slice Bootstrapping

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Use skill-local templates as SSOT:
  - `.qfai/assistant/skills/qfai-sdd/templates/spec-pack/`
  - `.qfai/assistant/skills/qfai-sdd/templates/contracts/`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/`

## Inputs Priority (Preflight)

Determine preflight mode in this exact order:

1. **specs-first**
   - `_shared/01..04` already exist.
2. **require-indexed**
   - `.qfai/require/require-*/01_sources.md` and `.qfai/require/require-*/02_requirement-index.md` exist.
3. **import-lite**
   - No indexed require files, but user provides external requirement materials.
4. **interview-start**
   - No indexed files and no external materials.

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

- Allowed only when the user explicitly states `Simulation mode allowed`.
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
- Reviewer must check Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are risk signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Keep the current layered spec layout unchanged (`_shared + spec-XXXX`, required edges preserved).
- `require/` is input traceability only; specs remain detailed SSOT.
- If mode is **import-lite**:
  - create/update `.qfai/require/require-*/01_sources.md` and `.qfai/require/require-*/02_requirement-index.md` with minimal content;
  - capture import-lite evidence in `.qfai/evidence/import-lite-<work-id>.md`.
- For **import-lite** and **interview-start**, minimum input set before writing shared artifacts:
  - Objective
  - Initiative (scope and assumptions)
  - Capabilities
  - Business Flow (high-level)
  - Constraints
  - Glossary seed
- Missing mandatory inputs must be recorded as OQ in `.qfai/require/require-*/03_open-questions.md`.

## Goal

Start SDD safely from whichever preflight mode is available and produce shared/slice artifacts without hidden assumptions.

## Non-goals

- Final plan lock (`plan.md`, `06_Plan.md`) when slice grounding is incomplete.
- Production code implementation.

## Mandatory Outputs

- `.qfai/specs/_shared/01_Objective.md`
- `.qfai/specs/_shared/02_Initiative.md`
- `.qfai/specs/_shared/03_Capabilities.md`
- `.qfai/specs/_shared/04_Business-flow.md`
- `.qfai/specs/_shared/05_Contracts.md`
- `.qfai/specs/_shared/06_Glossary.md`
- `.qfai/specs/_shared/07_Constraints.md`
- `.qfai/specs/spec-XXXX/01_User-stories.md`
- `.qfai/specs/spec-XXXX/02_Acceptance-criteria.md`
- `.qfai/specs/spec-XXXX/03_Business-rules.md`
- `.qfai/specs/spec-XXXX/04_Examples.feature`
- `.qfai/specs/spec-XXXX/05_Test-cases.md`
- review artifacts under `.qfai/review/<scope>/<layer>/attempt-<NN>/`
- Evidence file: `.qfai/evidence/sdd-refinement-<spec-id>.md`
- Import-lite evidence when applicable: `.qfai/evidence/import-lite-<work-id>.md`

## Required Process

1. Run preflight mode determination.
2. If import-lite, generate minimal `require` index files and import-lite evidence first.
3. Build/update `_shared` layer with explicit source linkage.
4. Build at least one grounded spec slice (`01..05`) for target capability.
5. Record unresolved inputs as Open Questions.
6. Request Reviewer gate and record result.

## Review Gate Artifacts (RCP)

For each completed layer gate, create:

- `.qfai/review/<scope>/<layer>/attempt-<NN>/review_request.md`
- `.qfai/review/<scope>/<layer>/attempt-<NN>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/<scope>/<layer>/attempt-<NN>/summary.json`

Scope and layer mapping:

- shared scope: `.qfai/review/shared/<layer>/attempt-<NN>/`
  - required layers: `objective`, `initiative`, `capabilities`, `business-flow`
  - optional layers: `contracts`, `glossary`, `constraints`
- spec scope: `.qfai/review/spec-XXXX/<layer>/attempt-<NN>/`
  - required layers: `user-stories`, `acceptance-criteria`, `business-rules`, `examples`, `test-cases`
  - optional layer: `plan`

RCP rules:

- Start from `attempt-01`; increment attempt when re-review is needed.
- Record fingerprint (`sha256`) and input file paths in `summary.json`.
- If feedback exists in any reviewer result, mark `changes_requested`, fix artifacts, increment attempt, and restart all reviewers from the first reviewer.
- `summary.json.aggregate.status` can be `fixed` only when all reviewers are `pass` and total feedback is `0`.
- Required/optional gate definitions and reviewer requirements are controlled by `.qfai/assistant/steering/review-gate.rules.yml`.
- Use templates from `.qfai/assistant/skills/qfai-sdd-refinement/templates/review/`.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- report selected preflight mode and evidence;
- confirm shared and slice mandatory outputs exist;
- ensure unresolved gaps are represented as OQ (no silent assumptions);
- confirm required traceability edges can be derived from produced artifacts.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/sdd-refinement-<spec-id>.md`

Required sections:

- Objective
- Preflight mode and rationale
- Inputs reviewed (files/paths)
- Generated/updated artifacts
- Open questions summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- selected preflight mode
- generated shared/slice artifact paths
- unresolved OQ count
- reviewer result
- ready-for-next command (`/qfai-sdd-planning`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Preflight mode was determined and recorded.
- [ ] Import-lite evidence was generated when import-lite mode was used.
- [ ] Shared and slice mandatory outputs exist.
- [ ] Missing inputs were logged in `.qfai/require/require-*/03_open-questions.md`.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Review Cycle Checklist (MUST)

- [ ] Review artifacts were generated for every required layer gate completed in this run.
- [ ] All required reviewers completed their reviews for each attempt.
- [ ] Any feedback triggered return, fix, attempt increment, and full re-review from the first reviewer.
- [ ] `summary.json` is marked `fixed` only when all reviewers passed with zero feedback.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-sdd-planning`.
  Action: finalize `plan.md` and `spec-XXXX/06_Plan.md` on top of grounded slices.
- Need more upstream clarification: `/qfai-discuss`.
  Action: resolve missing objective/scope/constraints and rerun refinement.
- Require index correction needed: `/qfai-require`.
  Action: refresh sources/index and update OQ before rerunning refinement.
