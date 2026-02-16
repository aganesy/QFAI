<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd
title: QFAI SDD Unified (Outline/Slice/Plan/Delta)
description: "Create and update layered SDD artifacts (\_shared + spec-XXXX) in one workflow."
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

- Delegate: SpecWriter + TraceabilityBuilder draft shared/spec layered artifacts and edge mappings.
- Delegate: Architect + TestStrategist draft and finalize `plan.md` and `06_Plan.md`.
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

- Do NOT reintroduce options marked as rejected in `09_delta.md` (or `*_delta.md`).
- If a rejected option must be reconsidered, add a `[RE-OPEN]` decision record with explicit approval evidence.

## Workflow Convention (Mandatory)

- **This skill proceeds in this exact order: Outline -> Slice -> Plan finalize -> Delta update.**
- **Upper-to-lower references are forbidden. Lower-to-upper references are allowed.**
- **Connections between layers MUST be represented by IDs and required edges (`US->AC->BR->SC->CASE`).**
- **Plan finalize MUST happen after at least one user-story slice is grounded.**
- **Unresolved items MUST be moved to `08_Open-questions.md` (spec scope) or `_shared/09_Open-questions.md` (shared scope).**

## CRITICAL CONSTRAINTS (Read First)

- This is the unified SDD skill. Do not split work into deprecated refinement/planning skills.
- Use only skill-local templates:
  - `.qfai/assistant/skills/qfai-sdd/templates/spec-pack/`
  - `.qfai/assistant/skills/qfai-sdd/templates/contracts/`
- Scenario specification in `04_Examples.feature` is strict:
  - exactly one `Feature:`
  - one or more tagged `Scenario:`
  - each scenario includes `@SC-XXXX-YYYY` and references `AC-XXXX-YYYY` in body comments
- Reference direction rules from `.qfai/specs/README.md` must be enforced:
  - upper-to-lower references are forbidden
  - lower-to-upper references are allowed
- Do not leave ambiguity untracked:
  - ask the user when certainty is below threshold
  - unresolved decisions become explicit Open Questions

### Phase 1 - Outline (layer-first)

Create/update:

- `_shared/01_Objective.md`
- `_shared/02_Initiative.md`
- `_shared/03_Capabilities.md`
- `_shared/04_Business-flow.md`
- `_shared/05_Contracts.md`
- `_shared/06_Glossary.md`
- `_shared/07_Constraints.md`

Rules:

- Temporary `TBD` is allowed, but each `TBD` must be mirrored into `_shared/09_Open-questions.md`.

### Phase 2 - Slice (slice-first)

Create/update:

- `spec-XXXX/01_User-stories.md`
- `spec-XXXX/02_Acceptance-criteria.md`
- `spec-XXXX/03_Business-rules.md`
- `spec-XXXX/04_Examples.feature`
- `spec-XXXX/05_Test-cases.md`

Slice gate (must pass before Phase 3):

- For each US, AC must exist.
- For each AC, BR and SC must exist.
- For each CASE, SC reference must exist.
- `SC` tags must align with the target `spec-XXXX` namespace.

### Phase 3 - Plan finalize

Create/update:

- `plan.md`
- `spec-XXXX/06_Plan.md`

Rules:

- Finalize only after at least one user-story slice has passed Phase 2 gate.
- `plan.md` is runtime How SSOT and must include implementation tasks, verification strategy, and split plan.
- `spec-XXXX/06_Plan.md` must stay synchronized with `plan.md`.

### Phase 4 - Delta update

Create/update:

- `spec-XXXX/09_delta.md` (or `spec-XXXX/*_delta.md`)

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

Create or update layered SDD artifacts in one run so downstream execution phases can start without command switching.

## Non-goals

- Writing production code or runnable tests.
- Skipping phase order or bypassing slice/plan gates.
- Reintroducing rejected options without explicit re-open approval.

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
- `.qfai/specs/spec-XXXX/06_Plan.md`
- `.qfai/specs/spec-XXXX/09_delta.md` (or `*_delta.md`)
- Updated contracts under `.qfai/contracts/**` when required
- Evidence file: `.qfai/evidence/sdd-<spec-id>.md`

## Required Process

1. Analyze repository context, existing artifacts, constraints, and open decisions.
2. Execute Phase 1 (Outline) in layer-first order.
3. Execute Phase 2 (Slice) for at least one user-story slice and pass slice gate.
4. Execute Phase 3 (Plan finalize) and make `plan.md` actionable while synchronizing `06_Plan.md`.
5. Execute Phase 4 (Delta update) and record adoption/rejection rationale.
6. Run static checks and record outcomes in evidence.

## Unified SDD Quality Gate

Run static checks:

- Confirm required `_shared` and `spec-XXXX` layered files exist.
- Confirm `04_Examples.feature` has exactly one `Feature:` block.
- Confirm each scenario in `04_Examples.feature` has a valid `@SC-XXXX-YYYY` tag and references `AC-XXXX-YYYY`.
- Confirm reference direction follows lower-to-upper only.
- Confirm required edges `US -> AC -> BR -> SC -> CASE`.
- Confirm `plan.md` exists and contains implementation tasks + verification strategy + split plan.
- Confirm `06_Plan.md` stays synchronized with `plan.md`.
- Confirm `09_delta.md` (or `*_delta.md`) includes rejected guardrails (`DO NOT`, `Temptation`) when rejections exist.

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
- Decision record IDs touched in `09_delta.md` (or `*_delta.md`)
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Unified SDD quality gate result

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Outline -> Slice -> Plan finalize -> Delta update order was preserved.
- [ ] Upper-to-lower references were not introduced.
- [ ] At least one user-story slice passed gate before plan finalization.
- [ ] Required `_shared` + `spec-XXXX` outputs exist and are internally consistent.
- [ ] `plan.md` is finalized with implementation/test strategy.
- [ ] `06_Plan.md` is synchronized with `plan.md`.
- [ ] `09_delta.md` (or `*_delta.md`) contains adoption/rejection rationale.
- [ ] Unresolved items are tracked in shared/spec Open Questions files.
- [ ] Quality gate checks are recorded in evidence.
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
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
- Want to add contracts:
  Action: create files under `.qfai/contracts/(api|db|ui)/` from `templates/contracts/*` and declare `QFAI-CONTRACT-ID`.
- Spec pack needs correction: rerun `/qfai-sdd`.
  Action: fix layered `_shared + spec-XXXX` consistency and decision records, then regenerate evidence.
