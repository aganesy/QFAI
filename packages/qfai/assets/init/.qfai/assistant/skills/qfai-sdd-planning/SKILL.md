<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-planning
title: QFAI SDD Planning (How SSOT)
description: "Create 17_Plan.md and lock implementation constraints for downstream execution phases."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, QAEngineer, CodeReviewer]
mode: approval-gated

---

# /qfai-sdd-planning — Build Plan SSOT

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
- Do NOT duplicate templates in this workflow markdown.
- Completion requires a format self-check in evidence.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/18_delta.md`
- P4: `.qfai/specs/<spec-id>/01_Spec.md`, `06_User-stories.md`, `09_Examples.feature`, `16_Traceability-ledger.md`, contracts

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

- Delegate: Architect, TestStrategist create first drafts of plan and verification-strategy drafts.
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

- Do NOT reintroduce options marked as rejected in `18_delta.md`.
- If planning must revisit a rejected option, add a `[RE-OPEN]` decision record with explicit approval evidence.

## Workflow Convention (Mandatory)

- Planning owns `17_Plan.md` only.
- Finalize plan details after at least one user-story slice is grounded in refinement outputs.
- Keep planning aligned with lower-to-upper reference direction and `@layer-*` policy from `steering/test-layers.md`.

## CRITICAL CONSTRAINTS (Read First)

- This phase MUST create or update:
  - `.qfai/specs/spec-XXX/17_Plan.md`
- The plan is the How SSOT and must be concise, explicit, and implementation-binding.
- Use only the planning skill-local template:
  - `.qfai/assistant/skills/qfai-sdd-planning/templates/spec-pack/17_Plan.md`
- Required sections must exist in fixed order:
  1. `Metadata`
  2. `Context and Scope`
  3. `Execution Strategy`
  4. `Milestones`
  5. `Verification and Gates`
  6. `Risks and Mitigations`
  7. `Open Questions`
  8. `Done Checklist`
- `Open Questions` should end with no unresolved blockers by default.
- Planning decisions should be appended to `18_delta.md` when strategy changes.
- This release stage does not use validator hard-gates for the new file set; rely on static checks and reviewer gate.
- Completion must be approved by a reviewer who did not author the plan.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: remove ambiguity from implementation decisions.
- Deliverable completeness: verify required sections and concrete constraints.
- OQ / placeholder scan: remove unresolved placeholders (`TBD`, `TODO`, `???`, etc.) unless explicitly deferred.
- Run static checks proving `17_Plan.md` is actionable and references grounded slices.

## Goal

Transform layered refinement artifacts into a constrained `17_Plan.md` that downstream execution phases must follow.

## Non-goals

- Writing production code or runnable tests.
- Re-authoring refinement-owned files unless an approved change request requires it.

## Mandatory Outputs

- `.qfai/specs/spec-XXX/17_Plan.md`
- Updated `.qfai/specs/spec-XXX/18_delta.md` when planning decisions changed
- Evidence file: `.qfai/evidence/sdd-planning-<spec-id>.md`

## Plan Template (Minimum)

- Use `.qfai/assistant/skills/qfai-sdd-planning/templates/spec-pack/17_Plan.md` as the single source of truth.
- Do not duplicate the template content in this workflow file.

## Change Control During Execution

If execution discovers a conflicting implementation path:

1. STOP execution planning.
2. Create a Change Request with at least 3 options plus recommendation.
3. Wait for explicit user approval.
4. Re-run the owner skill to update upstream artifacts (do not patch upstream directly from downstream).
5. Re-run static checks and reviewer gate after approved updates.

## Quality Gate

Run static checks:

- Confirm `17_Plan.md` exists and required sections are present in order.
- Confirm plan references at least one grounded user-story slice from refinement outputs.
- Confirm verification strategy aligns with `steering/test-layers.md`.
- Confirm strategy changes are reflected in `18_delta.md` when applicable.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/sdd-planning-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs and spec-id
- `DR-HOW-*` IDs added or updated
- Static planning gate result
- Confirmation that downstream phases must follow the plan

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `17_Plan.md` exists and matches required heading order.
- [ ] Any planning strategy change is recorded in `18_delta.md`.
- [ ] Blockers are resolved, or approved exceptions are recorded.
- [ ] Planning static gate checks are recorded in evidence.
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.
