---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Implement automated acceptance tests (E2E/API/Integration) aligned with US/TC/CON-API obligations from specs and contracts."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  - Orchestrator
  - TestVolumeEstimator
  - ATDDE2EImplementer
  - ATDDAPIImplementer
  - ATDDIntegrationImplementer
  - QAEngineer
  - TestEngineer
  - BackendEngineer
  - FrontendEngineer
  - Reviewer
  - RuntimeGatekeeper
  - DevOpsCIEngineer
  - CodeReviewer
mode: execution-focused
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-atdd — Implement Automated Acceptance Tests (ATDD)

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow the relevant directory README template and sample.
- Do not copy templates/samples into this prompt or other prompt markdown.
- Generated artifacts must match README-defined structure (headings, ordering, table columns).
- Completion requires a format self-check in evidence.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/01_Spec.md` (Primary SSOT / Consumer View)
- P4: specs/contracts obligations
  - `.qfai/specs/<spec-id>/02_User-stories.md` (US)
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md` (AC)
  - `.qfai/specs/<spec-id>/05_Examples.md` (EX)
  - `.qfai/specs/<spec-id>/06_Test-Cases.md` (TC)
  - `.qfai/contracts/api/**` (CON-API)
- P5: `.qfai/specs/<spec-id>/09_delta.md` (Decision Records; if no spec yet, state "not applicable")
- P6: legacy artifacts (optional only)
  - `.qfai/specs/<spec-id>/scenario.feature`
  - coverage ledger files

## Read Set Contract (Mandatory)

- Default Mode:
  - `.qfai/specs/<spec-id>/01_Spec.md`
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
  - `.qfai/specs/<spec-id>/05_Examples.md`
  - `.qfai/specs/<spec-id>/06_Test-Cases.md`
- Escalation Mode:
  - allowed only when `01_Spec.md` Escalation Hook signals ambiguity / conflict / missing constraint / trade-off
  - read only `.qfai/specs/_policies/01_Objective.md` and `.qfai/specs/_policies/08_Decisions.md`
- Do not read `_policies/**` by default.

## Sub-agent Delegation (MANDATORY)

This section is mandatory and overrides any conflicting fallback text in this file.

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT serve as Reviewer or skip delegation for convenience.

### Capability Probe (MUST)

1. Run one harmless Probe Task (for example: "reply with ok") once at stage start.
2. If subagents are unavailable, explicitly ask the user for Simulation mode approval.
3. Without explicit approval, stop the stage and do not continue.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- When used, record both in outputs/evidence:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this fixed table schema:

| Step | Role (sub-agent) | Task title   | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ------------ | ------------ | ------------- | -------------------- |
| 1    | example-role     | example-task | file/path.md | evidence.md   | PASS/REVISE          |

- `Output (refs)` must point to in-file anchors or relative evidence file paths.

### Stage Minimum Roles (MUST)

- Delegate: TestVolumeEstimator, ATDDE2EImplementer, ATDDAPIImplementer, ATDDIntegrationImplementer.
- Integrate: Orchestrator consolidates delegated outputs and presents results.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - Required roles were delegated (no orchestrator self-authoring).
  - Drift Protocol enforced (no upstream edits without approval and owner rerun).
  - Test-layer policy enforced via `test-layers.md`.
  - Coverage obligations met: E2E covers `US`, Integration covers `TC`, API covers `CON-API`.
  - Validation evidence exists and `qfai validate --fail-on error` passes.
  - Floors/ratios are signals, not gates.
  - `scenario.feature` and coverage ledgers are optional legacy inputs, not completion gates.
- Do not declare DONE until Reviewer returns `PASS`.

### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol (no upstream edits without user approval + CR)
- must: verify test-layer obligations from `steering/test-layers.md`
- must: provide validation evidence (`qfai validate --fail-on error`)
- must_not: treat volume ratios/floors as hard gates
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

Before moving forward in this stage, refresh:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

Rules:

- Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, stale facts).
- Fill what is verifiable from repository evidence.
- If something cannot be verified, record an Open Question and ask the user.
- Update steering when new facts are discovered during this stage.

## Delta Rejected Guard (Mandatory)

- Do not reintroduce options marked as rejected in 09_delta.md.
- If a rejected option must be reconsidered, create a `[RE-OPEN]` Decision Record that references prior DR-ID and explicit approval.

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion based on unit/component tests.
- `10_Plan.md` is the primary How SSOT for execution phases.
- If `10_Plan.md` is missing, stop and run owner planning flow before proceeding.
- Completion gate is validation with zero errors (`qfai validate --fail-on error`).
- Coverage obligations are mandatory:
  - `tests/e2e/**` must cover all required `US-*`.
  - `tests/integration/**` must cover all required `TC-*`.
  - `tests/api/**` must cover all required `CON-API-*`.
- Forbidden references:
  - `tests/api/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY`.
  - `tests/e2e/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY`.
- Unknown references (`US/TC/CON-API` not declared) must be treated as errors.
- Floors/ratios are planning signals only, not gates.
- Legacy `scenario.feature` or coverage ledgers may exist but are not mandatory inputs for completion.
- Evidence file is required under `.qfai/evidence/` and must not be committed.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- Resolve or explicitly defer undefined/ambiguous items with rationale.
- Verify every expected artifact exists and required sections are populated.
- Scan generated artifacts for unresolved placeholders (`TBD`, `TODO`, `???`, etc.).
- Run the smallest smoke check proving runnable behavior (or state "not applicable" with rationale).

## Goal

Turn specs/contracts obligations (`US` / `TC` / `CON-API`) into runnable acceptance tests in this repository.

## Scope (ATDD only)

- In scope: E2E, API, Integration.
- Out of scope: Unit and Component (`/qfai-tdd-red`).

## Non-goals

- Unit/Component test implementation.
- Product feature changes beyond what is needed for ATDD test execution.

## Mandatory Outputs

1. Test Volume Estimate (signal table with evidence)
2. Coverage obligations checklist (`US` / `TC` / `CON-API`)
3. Implemented tests per layer (E2E/API/Integration)
4. Reviewer notes (`PASS` or concrete rework list)
5. Evidence file: `.qfai/evidence/atdd-<spec-id>.md`

## Volume Signals (mandatory, not gates)

- E2E signal: number of required `US-*`
- API signal: number of declared `CON-API-*`
- Integration signal: number of required `TC-*`
- When signals are low/high, propose options and recommendation; do not fail solely on signal values.

### Estimator output table (required)

| Layer       | Raw count | Signal | Evidence      | Notes |
| ----------- | --------: | -----: | ------------- | ----- |
| E2E         |       #US |  E2E_s | user stories  |       |
| API         |      #CON |  API_s | API contracts |       |
| Integration |       #TC |  INT_s | test cases    |       |

## Annotation obligations (mandatory)

Every generated ATDD test MUST include QFAI annotations by layer:

- `tests/e2e/**`: `QFAI:SPEC-XXXX:US-YYYY`
- `tests/integration/**`: `QFAI:SPEC-XXXX:TC-YYYY`
- `tests/api/**`: `QFAI:CON-API-XXXX`

Notes:

- AC annotations are optional in code.
- `QFAI:CON-API-*` in E2E is not forbidden, but contract guarantee belongs to API tests.

## Success Criteria (Definition of Done)

- All required `US` are covered by E2E tests.
- All required `TC` are covered by integration tests.
- All required `CON-API` are covered by API tests.
- Validation passes: `qfai validate --fail-on error`.
- Repository quality gates (format/lint/type/tests/pack) pass with evidence.
- Evidence file exists and includes work orders + reviewer notes.
- Completion is approved by a reviewer who did not implement tests.

## Not-done criteria

- Any required `US` / `TC` / `CON-API` remains uncovered.
- Forbidden references remain.
- Tests exist but were never executed.
- Validation evidence is missing or failing.

## Failure handling (mandatory)

- If blocked/unknown, stop and raise a Decision Record.
- Do not declare completion when any gate is FAIL; iterate until PASS.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/atdd-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Test volume estimate
- Coverage obligations checklist
- Work Orders Summary
- Execution logs
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

Template:

```md
# ATDD Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Test volume estimate

## Coverage obligations checklist

## Work Orders Summary

## Execution logs

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

## ATDD Work Orders (mandatory)

- Test Volume Estimator: compute US/TC/CON signals with evidence.
- ATDD E2E Implementer: implement required `US` coverage.
- ATDD API Implementer: implement required `CON-API` coverage.
- ATDD Integration Implementer: implement required `TC` coverage.
- Reviewer: validate coverage obligations + gate results (non-edit).
- Runtime Gatekeeper: run suites and capture logs.

## Completion Separation (mandatory)

- Implementation and completion approval must be separate.
- Reviewer must be non-edit (`PASS` or `REVISE` only).

## Stage Gates (Do not skip)

- P0: Plan and obligations checklist prepared.
- P1: Layer assignment validated.
- P2: E2E implementation completed.
- P3: API implementation completed.
- P4: Integration implementation completed.
- P5: Validation gate passed.
- P6: Runtime evidence captured.
- P7: Repo quality gates passed.
- P8: Reviewer confirms completion.

## Completion Criteria (Final Gate)

Before declaring completion:

1. Confirm required `US` / `TC` / `CON-API` coverage is complete.
2. Run:

   ```bash
   qfai validate --fail-on error
   ```

3. Run repository standard gates:
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)
4. Record exact commands and outcomes.

If commands cannot be run due to environment limits, request user execution and do not assume PASS.

## Output

- Acceptance test implementation files (with required annotations)
- Runbook snippet (copy-paste command)
- Verification evidence summary
- Gate results (PASS/FAIL)

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs (instructions/steering and spec delta)
- DR-IDs referenced (or "none")
- Confirmation that no rejected options were reintroduced (or RE-OPEN DR-IDs)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] Mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by an independent reviewer.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated.
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-tdd-red`.
  Action: derive unit/component RED tests from acceptance tests.
- Acceptance tests need fixes: rerun `/qfai-atdd`.
  Action: close uncovered `US` / `TC` / `CON-API` obligations and rerun validation.
- Implementation phase: `/qfai-tdd-green`.
  Action: implement code to satisfy failing tests.
