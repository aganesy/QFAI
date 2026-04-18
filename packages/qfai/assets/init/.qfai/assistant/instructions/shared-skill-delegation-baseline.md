# Shared Skill Delegation Baseline

Use this document to keep SKILL bodies compact.
Skill files should reference this baseline and only add role-, stage-, or gate-specific rules.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- The orchestrator may create work orders, delegate tasks, integrate outputs, and present results.
- The orchestrator must not generate the primary artifact first draft.
- The orchestrator must not self-approve or act as reviewer for convenience.

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

Every major artifact in the stage should include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

- `Output (refs)` should point to in-file anchors or relative evidence paths.

## Reviewer Gate Baseline

- Final completion gate must be delegated to an independent reviewer.
- Reviewers must verify Drift Protocol enforcement.
- Reviewers must verify test-layer policy enforcement when relevant.
- Do not treat test volume ratios or floors as hard gates unless the skill explicitly says so.
- Do not declare DONE until all routed blocking reviewers return `PASS`.
- Every reviewer returning `FAIL` or `REVISE` must include a concrete fix proposal.

## Work order template

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol
- must: follow applicable test-layer or validation policy
- must_not: patch upstream artifacts directly when owner rerun is required
Output format:
- <headings / bullet schema>
Quality bar:
- PASS if ...
- REVISE if ...
```

## Reviewer response template

```text
Result: PASS | REVISE
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```
