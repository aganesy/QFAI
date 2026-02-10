<!--
Deprecated alias workflow stub.
Canonical workflow: .qfai/assistant/skills/qfai-sdd-refinement/SKILL.md
-->

---

name: qfai-spec
title: QFAI Spec (Deprecated Alias)
description: "Deprecated alias. Forward to qfai-sdd-refinement."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, TodoWrite, Bash]
roles: [Planner, Architect, RequirementsAnalyst]
mode: approval-gated

---

# /qfai-spec (Deprecated Alias)

This workflow is a compatibility alias.
Use `/qfai-sdd-refinement` for active work.

## Stage 0 — Steering completion refresh (mandatory)

Before forwarding to `/qfai-sdd-refinement`, refresh:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

If data is incomplete, fill what can be verified and raise Open Questions for unknowns.


## Sub-agent Delegation (MANDATORY)

This section is mandatory for v1.3.16 and overrides any conflicting fallback text in this file.

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
| --- | --- | --- | --- | --- | --- |
| 1 | <role> | <task> | <refs> | <refs> | PASS/REVISE |

- `Output (refs)` must point to in-file anchors or relative evidence file paths.

### Stage Minimum Roles (MUST)
- Delegate: SpecWriter, TraceabilityBuilder create first drafts of refinement artifact drafts (alias mode).
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
## CRITICAL CONSTRAINTS (Read First)

- Do NOT treat this file as SSOT for refinement behavior.
- The canonical workflow is: `.qfai/assistant/skills/qfai-sdd-refinement/SKILL.md`.
- If this file conflicts with the canonical workflow, the canonical workflow wins.
- Ensure `case-catalogue.md` is table-based (category sections + `Case title` column) when executing the canonical workflow.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- Execute `/qfai-sdd-refinement` and follow its workflow entirely.
- Produce outputs and evidence required by the canonical workflow.
- Run the canonical quality gate command defined there.

## Evidence (MANDATORY)

- Evidence requirements are defined by the canonical workflow:
  `.qfai/assistant/skills/qfai-sdd-refinement/SKILL.md`.

## FINAL CHECKLIST (Check Last)

- [ ] I used `/qfai-sdd-refinement` as the authoritative workflow.
- [ ] I followed canonical constraints, process, and gate commands.
- [ ] I did not edit this deprecated alias as a source of truth.
