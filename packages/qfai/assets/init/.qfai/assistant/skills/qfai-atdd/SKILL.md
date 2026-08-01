---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Implement automated acceptance tests (E2E/API/Integration) aligned with US/TC/CON-API obligations from specs and contracts."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  - orchestrator
  - delivery-planner
  - test-design-analyst
  - qa-strategist
  - acceptance-test-engineer
  - devops-ci-engineer
  - completion-reviewer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
mode: execution-focused
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-atdd — Implement Automated Acceptance Tests (ATDD)

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- test scope decisions
- runtime environment confirmation

## FORMAT SSOT (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#format-ssot-mandatory`.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`
- P2: `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`
- P3: `.qfai/specs/<spec-id>/01_Spec.md` (Primary SSOT / Consumer View)
- P4: specs/contracts obligations
  - `.qfai/specs/<spec-id>/02_User-stories.md` (US)
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md` (AC)
  - `.qfai/specs/<spec-id>/05_Examples.md` (EX)
  - `.qfai/specs/<spec-id>/06_Test-Cases.md` (TC)
  - `.qfai/contracts/api/**` (CON-API)
  - `.qfai/contracts/ui/**` and `.qfai/contracts/design/**` when the target spec is UI-bearing
- P5: `.qfai/specs/<spec-id>/09_delta.md` (Decision Records; if no spec yet, state "not applicable")
- P6: legacy artifacts (optional only)
  - `.qfai/specs/<spec-id>/scenario.feature`
  - coverage ledger files

Do not read discussion-pack UI/UX sidecars. UI-bearing acceptance tests consume only specs and contracts normalized by `/qfai-sdd`.

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

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- Follow the shared baseline.
- Orchestrator MUST NOT self-approve.
- Orchestrator MUST NOT generate the primary artifact first draft.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

## Work Orders Summary

Use the shared schema.

### Stage Minimum Roles (MUST)

- Delegate: `test-design-analyst` defines coverage and layer ownership.
- Delegate: `acceptance-test-engineer` implements E2E, API, and integration acceptance tests.
- Delegate: `devops-ci-engineer` captures execution evidence when CI/runtime proof is needed.
- Integrate: `orchestrator` consolidates delegated outputs and presents results.
- Gate: `completion-reviewer` is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-gate-baseline`.
- Final completion gate MUST be delegated to an independent `completion-reviewer`.
- ATDD-specific reviewer checks:
  - coverage obligations met: E2E covers `US`, API covers `CON-API`, and every `TC` is covered from the directory its declared `Level` routes to;
  - Coverage Depth Matrix is reviewed and no unjustified `X` cells remain;
  - validation evidence exists and `npx qfai validate --profile atdd --fail-on error` passes;
  - Drift Protocol is enforced;
  - test-layer policy is checked against `.qfai/assistant/catalog/test-layers.md`;
  - coverage floors and ratios are signals, not gates;
  - `scenario.feature` and coverage ledgers remain optional legacy inputs, not completion gates.
- Route specialist reviewers from `.qfai/assistant/manifest/agent-routing.yml`.
- Default ATDD review set:
  - `completion-reviewer`
  - `qa-gatekeeper`
- Add `implementation-reviewer` only when helper/runtime support code changed.
- Do not declare DONE until all routed blocking reviewers return `PASS`.

### Work order template (copy/paste)

Use the shared template.

### Reviewer response template

Use the shared template.

- Required field: `Status (PASS/REVISE/PENDING)`. `PENDING` marks a gate that could not be run (see the baseline's reviewer-budget branch); it never counts as `PASS`.

## Stage 0 — Steering completion refresh (mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.

## Delta Rejected Guard (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`.

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion based on unit/component tests.
- `10_Plan.md` is the primary How SSOT for execution phases.
- If `10_Plan.md` is missing, stop and run owner planning flow before proceeding.
- Completion gate is validation with zero errors (`npx qfai validate --profile atdd --fail-on error`).
- Coverage obligations are mandatory:
  - `tests/e2e/**` must cover all required `US-*`.
  - Every `TC-*` must be covered from the directory its declared `Level` routes
    to: `L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
    `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`. A TC with no declared `Level`
    routes to `tests/integration/**`.
  - `tests/api/**` must cover all required `CON-API-*`.
- Forbidden references (a TC annotation outside its declared home):
  - `tests/api/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY` unless that TC
    declares `Level` `L4`/`API`.
  - `tests/e2e/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY` unless that TC
    declares `Level` `L5`/`E2E`.
- Unknown references (`US/TC/CON-API` not declared) must be treated as errors.
- Floors/ratios are planning signals only, not gates.
- Legacy `scenario.feature` or coverage ledgers may exist but are not mandatory inputs for completion.
- Evidence file is required under `.qfai/evidence/`. Stage evidence is
  **regenerable** and is not committed. **Governance records are different**:
  Change Requests (`.qfai/decisions/CR-*.md`) and durable decision records
  (`.qfai/evidence/decisions/*.json`) carry user approval, are not
  regenerable, and stay in version control — the managed `.gitignore` block
  negates them for that reason.

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Goal

Turn specs/contracts obligations (`US` / `TC` / `CON-API`) into runnable acceptance tests in this repository.

## Scope (ATDD only)

- In scope: E2E, API, Integration.
- Out of scope: Unit and Component (`/qfai-implement`).

## Non-goals

- Unit/Component test implementation.
- Product feature changes beyond what is needed for ATDD test execution.

## Mandatory Outputs

1. Test Volume Estimate (signal table with evidence)
2. **Coverage Depth Matrix** (per spec; see `references/test-case-depth-checklist.md`)
3. Coverage obligations checklist (`US` / `TC` / `CON-API`)
4. Implemented tests per layer (E2E/API/Integration)
5. Reviewer notes (`PASS` or concrete rework list)
6. Evidence file: `.qfai/evidence/atdd-<spec-id>.md`

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

- `tests/e2e/**`: `QFAI:SPEC-XXXX:US-YYYY` (plus `QFAI:SPEC-XXXX:TC-YYYY` for a
  TC that declares `Level` `L5`/`E2E`)
- `tests/integration/**`: `QFAI:SPEC-XXXX:TC-YYYY` (TCs declaring `L3`/
  `Integration`, and TCs with no declared `Level`)
- `tests/api/**`: `QFAI:CON-API-XXXX` (plus `QFAI:SPEC-XXXX:TC-YYYY` for a TC
  that declares `Level` `L4`/`API`)

Notes:

- A TC's annotation belongs in exactly one directory — the one its declared
  `Level` routes to. Placing it elsewhere is both uncovered (`QFAI-ATDD-112`)
  and forbidden (`QFAI-ATDD-121` / `QFAI-ATDD-122` / `QFAI-ATDD-123`). The rule
  is symmetric: an annotation left behind in `tests/integration/**` after the
  TC moved to `L4`/`L5` is rejected by `QFAI-ATDD-123` just as an early one in
  `tests/api/**` is rejected by `QFAI-ATDD-121`.
- AC annotations are optional in code.
- `QFAI:CON-API-*` in E2E is not forbidden, but contract guarantee belongs to API tests.

## Success Criteria (Definition of Done)

- All required `US` are covered by E2E tests.
- All required `TC` are covered from the directory their declared `Level` routes
  to (`L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
  `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`, no declared `Level` ->
  `tests/integration/**`). Duplicating a TC into a second layer is a
  not-done condition, not extra credit.
- All required `CON-API` are covered by API tests.
- Validation passes: `npx qfai validate --profile atdd --fail-on error`.
- Repository quality gates (format/lint/type/tests/pack) pass with evidence.
- Evidence file exists and includes work orders + reviewer notes.
- Completion is approved by a reviewer who did not implement tests.

## Not-done criteria

- Any required `US` / `TC` / `CON-API` remains uncovered.
- Forbidden references remain.
- Tests exist but were never executed.
- Validation evidence is missing or failing.
- Coverage Depth Matrix is missing or contains unjustified ❌ cells (normal-path-only coverage is incomplete).

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

- **Test Case Depth Analyst**: `test-design-analyst` evaluates test cases using `references/test-case-depth-checklist.md`, produces Coverage Depth Matrix, flags gaps in boundary/error/edge coverage.
- Test Volume Estimator: compute US/TC/CON signals with evidence.
- ATDD E2E Implementer: implement required `US` coverage.
- ATDD API Implementer: implement required `CON-API` coverage.
- ATDD Integration Implementer: implement required `TC` coverage.
- Reviewer: validate coverage obligations + gate results + Coverage Depth Matrix (non-edit).
- Runtime Gatekeeper: run suites and capture logs.

## Completion Separation (mandatory)

- Implementation and completion approval must be separate.
- Reviewer must be non-edit (`PASS` or `REVISE` only).

## Stage Gates (Do not skip)

- P0: Plan and obligations checklist prepared.
- P1: Layer assignment validated against `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.
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
   npx qfai validate --profile atdd --fail-on error
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

- Proceed (recommended): `/qfai-implement`.
  Action: run unified TDD micro-cycle (Red/Green/Refactor) one test at a time from test-list.md.
- Acceptance tests need fixes: rerun `/qfai-atdd`.
  Action: close uncovered `US` / `TC` / `CON-API` obligations and rerun validation.

## Default Autopilot Policy

The skill collapses avoidable per-session prompts to 0-1 by classifying every decision into one of three named buckets:

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - `companyName`
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow the auto-decide bucket (drop entries) but MUST NOT widen it. Widening triggers a Reviewer-Gate finding.

project_memory:

- Coverage obligations stay layer-pinned for US and CON-API: tests/e2e/** must cover all required US; tests/api/\*\* all required CON-API. Each TC is covered from the directory its declared Level routes to (L3/Integration -> tests/integration/**, L4/API -> tests/api/\*\*, L5/E2E -> tests/e2e/\*\*; no declared Level -> tests/integration/\*\*).
- Forbidden references guard the test-layer policy: a TC annotation outside its declared home is rejected — tests/api/** must not carry QFAI:SPEC-XXXX:TC-YYYY unless that TC declares L4/API, and tests/e2e/** likewise unless it declares L5/E2E.
- Floor / ratio signals are planning hints, never gates; legacy scenario.feature / coverage ledger files remain optional inputs.
