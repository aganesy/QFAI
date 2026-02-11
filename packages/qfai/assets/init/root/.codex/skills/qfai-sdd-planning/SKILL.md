---
name: qfai-sdd-planning
description: QFAI: SDD planning phase (How SSOT)
---

# qfai-sdd-planning

Follow the canonical QFAI skill document:

- .qfai/assistant/skills/qfai-sdd-planning/SKILL.md

## Sub-agent Delegation (MANDATORY)

This wrapper must enforce the same delegation rules as the canonical skill.

### Orchestrator Protocol (MUST)

- Orchestrator only creates work orders, delegates tasks, integrates outputs, and presents to the user.
- Orchestrator must not author the main artifact body or self-approve.

### Capability Probe (MUST)

1. Run a harmless Probe Task once at stage start.
2. If subagents are unavailable, request explicit user approval for `Simulation mode allowed`.
3. Without explicit approval, stop and do not continue the stage.

### Simulation mode (Opt-in only)

- Record `Subagents: simulated (reason: <why unavailable>)`.
- Record `User approval: <quote or reference>`.

### Work Orders Summary (MANDATORY evidence)

Major outputs must include `## Work Orders Summary` with this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

### Stage Minimum Roles (MUST)

- Delegate: Architect, TestStrategist create first drafts of plan and verification-strategy drafts.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Delegate final review to an independent Reviewer.
- Continue only when Reviewer returns `PASS`; otherwise apply `REVISE` actions.

Use the repository as the source of truth and keep outputs in the user's language.
