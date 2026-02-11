<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-planning
title: QFAI SDD Planning (How SSOT)
description: "Create plan.md and lock implementation constraints for downstream execution phases."
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
- P3: `.qfai/specs/<spec-id>/delta.md`
- P4: `.qfai/specs/<spec-id>/spec.md`, `scenario.feature`, contracts

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

- Do NOT reintroduce options marked as rejected in delta.md.
- If planning must revisit a rejected option, add a `[RE-OPEN]` decision record with explicit approval evidence.

## CRITICAL CONSTRAINTS (Read First)

- This phase MUST create or update:
  - `.qfai/specs/spec-XXXX/plan.md`
- The plan is the How SSOT and must be concise, explicit, and implementation-binding.
- Required headings must exist in fixed order:
  1. `Metadata`
  2. `Context & Scope`
  3. `Goals / Non-goals`
  4. `Architecture Outline`
  5. `Verification Strategy`
  6. `Implementation Plan`
  7. `Risks & Mitigations`
  8. `Open Questions / Blockers`
  9. `Done Checklist`
- `Open Questions / Blockers` should finish with blockers resolved by default.
- Planning decisions should be appended to delta as `DR-HOW-*` entries when strategy changes.
- You MUST run full validation:
  - `qfai validate --fail-on error`
- CI validation must remain default/full. Do NOT switch CI gates to `--phase refinement`.
- Completion must be approved by a reviewer who did not author the plan.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: remove ambiguity from implementation decisions.
- Deliverable completeness: verify required headings and concrete constraints.
- OQ / placeholder scan: remove unresolved placeholders (`TBD`, `TODO`, `???`, etc.) unless explicitly deferred.
- Smoke check (if applicable): run the smallest command to prove artifacts are valid.

## Goal

Transform refined SDD artifacts into a constrained implementation plan that downstream skills must follow.

## Non-goals

- Writing production code or tests.
- Expanding into a full design document beyond required constraints.

## Mandatory Outputs

- `.qfai/specs/spec-XXXX/plan.md`
- Updated `.qfai/specs/spec-XXXX/delta.md` when planning decisions changed
- Evidence file: `.qfai/evidence/sdd-planning-<spec-id>.md`

## Plan Template (Minimum)

- Use `.qfai/templates/spec/plan.md` as the single source of truth.
- Do not duplicate the template content in this workflow file.

## Change Control During Execution

If execution discovers a conflicting implementation path:

1. STOP implementation.
2. Create a Change Request with at least 3 options + recommendation.
3. Wait for explicit user approval.
4. Re-run the owner skill to update upstream artifacts (do not patch upstream directly from downstream).
5. Re-run full validation after approved updates.

## Quality Gate

Run:

```bash
qfai validate --fail-on error
```

This phase must pass default/full validation.

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
- Full validation result
- Confirmation that downstream phases must follow the plan

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `plan.md` exists and matches required heading order.
- [ ] Any planning strategy change is recorded in delta decisions.
- [ ] Blockers are resolved, or approved exceptions are recorded.
- [ ] Full validation passed (`qfai validate --fail-on error`).
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.
