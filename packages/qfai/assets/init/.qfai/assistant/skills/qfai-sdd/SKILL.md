<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd
title: QFAI SDD Unified (Outline/Slice/Plan/Delta)
description: "Create and update the full SDD spec pack (01..18) in one workflow."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, RequirementsAnalyst, SpecWriter, TraceabilityBuilder, TestStrategist, QAEngineer, CodeReviewer]
mode: approval-gated

---

# /qfai-sdd - Unified SDD Workflow

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Do NOT duplicate templates directly in this workflow markdown.
- Completion requires a format self-check in evidence.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: existing `.qfai/specs/<spec-id>/**` (if updating)
- P4: `.qfai/discuss/**`, `.qfai/require/**`, `.qfai/contracts/**`

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

- Delegate: SpecWriter + TraceabilityBuilder draft Outline/Slice artifacts and ledger.
- Delegate: Architect + TestStrategist draft and finalize `plan.md` and `17_Plan.md`.
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
    - E2E/API/Integration coverage aligns with `steering/test-layers.md` and the project plan.
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

## Stage 0 - Steering completion refresh (mandatory)

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
- If a rejected option must be reconsidered, add a `[RE-OPEN]` decision record with explicit approval evidence.

## Workflow Convention (Mandatory)

- **This skill proceeds in this exact order: Outline -> Slice -> Plan finalize -> Delta update.**
- **Upper-to-lower references are forbidden. Lower-to-upper references are allowed.**
- **Connections between layers MUST be written to `16_Traceability-ledger.md`.**
- **Plan finalize MUST happen after at least one user-story slice is grounded.**
- **Unresolved items MUST be moved to `15_Open-questions.md`; `TBD` is allowed only when tracked there.**

## CRITICAL CONSTRAINTS (Read First)

- This is the unified SDD skill. Do not split work into deprecated refinement/planning skills.
- Use only skill-local templates:
  - `.qfai/assistant/skills/qfai-sdd/templates/spec-pack/`
- Scenario specification in `09_Examples.feature` is strict:
  - exactly one `Feature:`
  - one or more tagged `Scenario:`
  - each scenario includes `@EX-XXXX @AC-XXXX @layer-*`
- Reference direction rules from `.qfai/specs/README.md` must be enforced:
  - upper-to-lower references are forbidden
  - lower-to-upper references are allowed
- Do not leave ambiguity untracked:
  - ask the user when certainty is below threshold
  - unresolved decisions become explicit Open Questions

### Phase 1 - Outline (layer-first)

Create/update:

- `02_Objective.md`
- `03_Initiative.md`
- `04_Capability.md`
- `05_Business-flow.feature`

Rules:

- Temporary `TBD` is allowed, but each `TBD` must be mirrored into `15_Open-questions.md`.

### Phase 2 - Slice (slice-first)

Create/update:

- `06_User-stories.md`
- `07_Acceptance-criteria.md`
- `08_Business-rules.md`
- `09_Examples.feature`
- `10_Test-cases.md`
- `16_Traceability-ledger.md`

Slice gate (must pass before Phase 3):

- For each AC, `EX >= 1` and `TC >= 1`.
- Ledger has rows traceable back to objective intent.
- `@layer-*` tags align with `steering/test-layers.md` policy.

### Phase 3 - Plan finalize

Create/update:

- `plan.md`
- `17_Plan.md`

Rules:

- Finalize only after at least one user-story slice has passed Phase 2 gate.
- `plan.md` is runtime How SSOT and must include implementation tasks, verification strategy, and split plan.
- `17_Plan.md` must stay synchronized as the layered mirror.

### Phase 4 - Delta update

Create/update:

- `18_delta.md`

Rules:

- Record adoption/rejection rationale.
- Rejected section MUST include `DO NOT` and `Temptation`.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: resolve ambiguity or explicitly defer with rationale and approval evidence.
- Deliverable completeness: verify all required artifacts and sections are present.
- OQ / placeholder scan: remove unresolved placeholders (`TBD`, `TODO`, `???`, `OPEN QUESTION`, etc.) unless explicitly deferred.
- Run static checks proving the pack is reviewable.

## Goal

Create or update a full SDD spec pack in one run so downstream execution phases can start without command switching.

## Non-goals

- Writing production code or runnable tests.
- Skipping phase order or bypassing slice/plan gates.
- Reintroducing rejected options without explicit re-open approval.

## Mandatory Outputs

- `.qfai/specs/spec-XXXX/01_Spec.md`
- `.qfai/specs/spec-XXXX/02_Objective.md`
- `.qfai/specs/spec-XXXX/03_Initiative.md`
- `.qfai/specs/spec-XXXX/04_Capability.md`
- `.qfai/specs/spec-XXXX/05_Business-flow.feature`
- `.qfai/specs/spec-XXXX/06_User-stories.md`
- `.qfai/specs/spec-XXXX/07_Acceptance-criteria.md`
- `.qfai/specs/spec-XXXX/08_Business-rules.md`
- `.qfai/specs/spec-XXXX/09_Examples.feature`
- `.qfai/specs/spec-XXXX/10_Test-cases.md`
- `.qfai/specs/spec-XXXX/11_Contracts.md`
- `.qfai/specs/spec-XXXX/12_Glossary.md`
- `.qfai/specs/spec-XXXX/13_Constraints.md`
- `.qfai/specs/spec-XXXX/14_Decisions.md`
- `.qfai/specs/spec-XXXX/15_Open-questions.md`
- `.qfai/specs/spec-XXXX/16_Traceability-ledger.md`
- `.qfai/specs/spec-XXXX/17_Plan.md`
- `.qfai/specs/spec-XXXX/18_delta.md`
- Updated contracts under `.qfai/contracts/**` when required
- Evidence file: `.qfai/evidence/sdd-<spec-id>.md`

## Required Process

1. Analyze repository context, existing artifacts, constraints, and open decisions.
2. Execute Phase 1 (Outline) in layer-first order.
3. Execute Phase 2 (Slice) for at least one user-story slice and pass slice gate.
4. Execute Phase 3 (Plan finalize) and make `plan.md` actionable while synchronizing `17_Plan.md`.
5. Execute Phase 4 (Delta update) and record adoption/rejection rationale.
6. Run static checks and record outcomes in evidence.

## Unified SDD Quality Gate

Run static checks:

- Confirm all `01..18` files exist in the target spec pack.
- Confirm `09_Examples.feature` has exactly one `Feature:` block.
- Confirm each scenario in `09_Examples.feature` has `@EX`, `@AC`, and `@layer-*` tags.
- Confirm reference direction follows lower-to-upper only.
- Confirm at least one ledger row can be traced to objective intent.
- Confirm each AC has at least one EX and one TC.
- Confirm `plan.md` exists and contains implementation tasks + verification strategy + split plan.
- Confirm `17_Plan.md` stays synchronized with `plan.md`.
- Confirm `18_delta.md` includes rejected guardrails (`DO NOT`, `Temptation`) when rejections exist.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/sdd-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Open questions summary (Open/Answered/Deferred)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs and spec-id
- Confirmation of phase order: Outline -> Slice -> Plan finalize -> Delta update
- Decision record IDs touched in `18_delta.md`
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Unified SDD quality gate result

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Outline -> Slice -> Plan finalize -> Delta update order was preserved.
- [ ] Upper-to-lower references were not introduced.
- [ ] At least one user-story slice passed gate before plan finalization.
- [ ] `01..18` outputs exist and are internally consistent.
- [ ] `plan.md` is finalized with implementation/test strategy.
- [ ] `17_Plan.md` is synchronized with `plan.md`.
- [ ] `18_delta.md` contains adoption/rejection rationale.
- [ ] Unresolved items are tracked in `15_Open-questions.md`.
- [ ] Quality gate checks are recorded in evidence.
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.

## Completion Checklist (MUST)

- [ ] This skill''s Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-prototyping`.
  Action: build contract-aligned skeleton implementation before deeper coding.
- Test-first path: `/qfai-atdd`.
  Action: implement acceptance tests from the finalized spec pack.
- Spec pack needs correction: rerun `/qfai-sdd`.
  Action: fix `01..18` consistency and decision records, then regenerate evidence.
