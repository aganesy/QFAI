<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-planning
title: QFAI SDD Planning (How SSOT)
description: "Create implementation-brief.md and lock implementation constraints for downstream execution phases."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, QAEngineer, CodeReviewer]
mode: approval-gated

---

# /qfai-sdd-planning — Build Implementation Plan SSOT

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

- Delegate: Architect, TestStrategist create first drafts of implementation-brief and test-strategy drafts.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks: required roles delegated, DoD satisfied, and no sign of orchestrator self-authoring.
- Do not declare DONE or handoff until Reviewer returns `PASS`.

### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: ...
- must_not: ...
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
  - `.qfai/specs/spec-XXXX/implementation-brief.md`
- The brief is the How SSOT and must be concise, explicit, and implementation-binding.
- Required headings must exist in fixed order:
  1. `Scope & Intent`
  2. `Architecture / Approach`
  3. `Implementation Plan`
  4. `Contracts & Data`
  5. `Test Strategy`
  6. `Risks & Mitigations`
  7. `Open Questions / Spikes`
- Open Questions / Spikes should be `None` unless a documented spike is required.
- Planning decisions should be appended to delta as `DR-HOW-*` entries when strategy changes.
- You MUST run full validation:
  - `qfai validate --fail-on error`
- CI validation must remain default/full. Do NOT switch CI gates to `--phase refinement`.
- Completion must be approved by a reviewer who did not author the brief.

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

- `.qfai/specs/spec-XXXX/implementation-brief.md`
- Updated `.qfai/specs/spec-XXXX/delta.md` when planning decisions changed
- Evidence file: `.qfai/evidence/sdd-planning-<spec-id>.md`

## Implementation Brief Template (Minimum)

- Use `.qfai/templates/spec/implementation-brief.md` as the single source of truth.
- Do not duplicate the template content in this workflow file.

## Change Control During Execution

If execution discovers a conflicting implementation path:

1. STOP implementation.
2. Update `implementation-brief.md`.
3. Append delta decision (`DR-HOW-*`).
4. Re-run full validation.

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
- Confirmation that downstream phases must follow the brief

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `implementation-brief.md` exists and matches required heading order.
- [ ] Any planning strategy change is recorded in delta decisions.
- [ ] Full validation passed (`qfai validate --fail-on error`).
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.
