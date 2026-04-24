---
name: qfai-sdd
title: QFAI SDD Unified (Outline/Slice/Plan/Delta)
description: "Create and update layered SDD artifacts (_policies + spec-XXXX) in one workflow."
argument-hint: "[<spec-id-or-name>] [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    requirements-analyst,
    solution-architect,
    test-design-analyst,
    qa-strategist,
    completion-reviewer,
    architecture-reviewer,
    implementation-reviewer,
    product-surface-reviewer,
    qa-gatekeeper,
  ]
routing-profile: default
mode: approval-gated
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-sdd - Unified SDD Workflow

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- OQ resolution
- NFR priority decisions

### Spec Create/Delete Confirmation (Mandatory)

- When creating a new spec: approval via AskUserQuestion is mandatory.
- When deleting an existing spec: approval via AskUserQuestion is mandatory.
- When only updating an existing spec: no confirmation is required.
- If approval is not granted, skip the operation and record the reason in `delta.md`.

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#format-ssot-mandatory`.
- Before writing `.qfai/**`, read:
  - `.qfai/discussion/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/agent-catalog.yml`
  - `.qfai/assistant/steering/agent-routing.yml`
  - `.qfai/assistant/steering/review-profiles.yml`
  - `.qfai/assistant/skills/qfai-sdd/references/review-cycle-playbook.md`
- Use skill-local templates as SSOT and keep templates out of this file.

## Inputs Priority (Preflight)

Determine preflight input in this order:

1. Latest `.qfai/discussion/discussion-*/` pack (lexicographically largest).
2. Validate that the latest discussion-pack has required files, minimum contents, and no blocking OQ.
3. If validation fails, stop `/qfai-sdd` and guide to `/qfai-discussion`.

Then read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: existing `.qfai/specs/<spec-id>/**` when updating
- P4: `.qfai/discussion/**`, `.qfai/contracts/**`

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

### Work Orders Summary (MANDATORY evidence)

Use the shared schema.

### Stage Minimum Roles (MUST)

- Delegate: `requirements-analyst` drafts requirement-aligned spec content and OQ handling.
- Delegate: `solution-architect` drafts structural, contract, and architecture-sensitive sections.
- Delegate: `test-design-analyst` drafts traceability, examples, and test-design structure.
- Delegate: `product-experience-architect` only when the target is UI-bearing.
- Integrate: `orchestrator` consolidates delegated outputs and presents them to the user for confirmation.
- Gate: `completion-reviewer` is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### No-argument batch delegation (MUST)

- Without argument (`/qfai-sdd`): target all capabilities listed in `_policies/03_Capabilities.md`.
- Enumerate targets from `.qfai/specs/_policies/03_Capabilities.md` and keep `spec-0001..N` mapping stable by Capability order.
- Run Contracts-first and Outline once per batch.
- Delegate Slice in parallel per spec.
- Validate gate and Review gate run once at batch tail after all target specs are integrated.
- Evidence is mandatory per spec: `.qfai/evidence/sdd-spec-XXXX.md`.
- Every per-spec evidence MUST include `## Work Orders Summary`.

### Reviewer Gate (MUST)

- Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md#reviewer-gate-baseline`.
- Reviewers must check Drift Protocol, `.qfai/assistant/steering/test-layers.md`, and validate evidence freshness.
- `QFAI-COV-207` warnings are density-smell signals, not hard gates.
- Route specialist reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- Default SDD review set:
  - `completion-reviewer`
- Conditional SDD reviewers:
  - `architecture-reviewer` for structural / contract / CLI changes
  - `product-surface-reviewer` for UI-bearing specs
  - `qa-gatekeeper` when validate, coverage, runtime, or prototyping evidence is affected
- Do not declare DONE or handoff until all routed blocking reviewers return `PASS`.

### Work order template (copy/paste)

Use the shared template.

### Reviewer response template

Use the shared template.

- Required field: `Status (PASS/REVISE)`.

## Review Cycle Protocol (RCP)

- Follow `.qfai/assistant/skills/qfai-sdd/references/review-cycle-playbook.md`.
- Footer SSOT: `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`.
- Allowed reviewer verdicts in the playbook remain `PASS` and `FAIL`.

## Stage 0 - Steering completion refresh (mandatory)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.

## Delta Rejected Guard (Mandatory)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`.

## Workflow Convention (Mandatory)

- Phase order is fixed: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update.
- Upper-to-lower references are forbidden. Lower-to-upper references are allowed.
- Reference direction shorthand: lower-to-upper only.
- Connections between layers MUST be represented by IDs and required edges (`US->AC->BR->EX->TC`).
- Plan finalize MUST happen after at least one user-story slice is grounded.
- Unresolved items MUST move to shared or spec open-question files.
- Detailed phase checklists live in `.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`.

## Slice Policy Protocol (Mandatory)

- Treat `_policies/11_Slice-Policy.md` as the SSOT for spec slicing decisions.
- If `_policies/11_Slice-Policy.md` is missing or stale, create or refresh it before continuing.
- Classify each target into a category (structural / CLI / skill / agent).
- Use `_policies/11_Slice-Policy.md` to decide CREATE, UPDATE, or DELETE.
- If a new CLI command or skill has no corresponding spec, propose CREATE.
- If a CLI command or skill has been removed but its spec still exists, propose DELETE.
- Do not start Phase 2 (Slice) until `_policies/11_Slice-Policy.md` exists and reflects the current slicing model.

## Arguments and Target Selection (Mandatory)

- With argument (`/qfai-sdd <spec-id-or-name> [--auto]`): update only the matched single spec target.
- Without argument (`/qfai-sdd`): target all capabilities listed in `_policies/03_Capabilities.md`.
- If `_policies/03_Capabilities.md` or `_policies/11_Slice-Policy.md` does not exist, bootstrap shared templates first.
- Capability order in `_policies/03_Capabilities.md` is SSOT for `spec-0001..N` assignment and ID stability.
- Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.

## CRITICAL CONSTRAINTS (Read First)

- This unified entrypoint owns the full SDD flow directly.
- Use only skill-local templates under `.qfai/assistant/skills/qfai-sdd/templates/`, including `templates/contracts`, `templates/report`, and `templates/specs`.
- Always write `.qfai/report/preflight_summary.md` before generating shared/spec artifacts.
- Contracts are contract-first mandatory outputs in this skill.
- UI-bearing targets must be normalized into downstream-ready contracts under `.qfai/contracts/design/**` and `.qfai/contracts/ui/**`.
- `_policies/05_Contracts.md` must include a Contract Index.
- `/qfai-sdd` must stop when discussion-pack is missing, incomplete, or has blocking OQ.
- Discussion-pack preflight is mandatory, including contract-first checks that UI-bearing targets are normalized into required design/ui contracts before downstream generation.
- Reviewer routing is fixed by `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- RCP wording must be sourced from `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`.
- `_policies/04_Business-Flow.md` must be Markdown and include Mermaid `flowchart` or `sequenceDiagram`.
- `05_Examples.md` must include `EX-ID` and `BR-Ref` mappings.
- `06_Test-Cases.md` must include `TC-ID`, `EX-Ref`, `AC-Refs`, and `Type`.
- `06_Test-Cases.md` quality depth must include normal-path plus error or boundary coverage.
- Do not complete the stage until `qfai validate --profile sdd --fail-on error --format github | tee .qfai/report/validate.log` exits with `error=0`.
- Reference direction rules from `.qfai/specs/README.md` must be enforced.
- Keep `specs/` definition-only and operational status under `.qfai/report/run-*`.
- Traceability depth and density-smell review rules live in:
  - `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/sdd-quality-gate.md`

## Goal

Create or update layered SDD artifacts in one run so downstream execution phases can start without command switching.

## Non-goals

- Writing production code or runnable tests
- Skipping phase order or bypassing slice/plan gates
- Reintroducing rejected options without explicit re-open approval

## Mandatory Outputs

- Shared `_policies/01..11` layered files
- Target `spec-XXXX/01..10` layered files
- Updated contracts under `.qfai/contracts/**`
- UI-bearing normalized contracts:
  - `.qfai/contracts/design/exploration-brief.yaml`
  - `.qfai/contracts/design/evaluation-rubric.yaml`
  - `.qfai/contracts/design/evaluator-calibration.yaml`
  - `.qfai/contracts/design/selected-direction.yaml`
  - `.qfai/contracts/design/design-system.yaml`
  - `.qfai/contracts/ui/*.yaml`
- `.qfai/report/preflight_summary.md`
- Evidence file: `.qfai/evidence/sdd-spec-XXXX.md`

The canonical file set is defined by skill templates under `.qfai/assistant/skills/qfai-sdd/templates/`.

## Required Process

1. Run preflight on the latest discussion-pack and stop if blockers remain.
2. Analyze repository context, existing artifacts, constraints, and open decisions.
3. Write `.qfai/report/preflight_summary.md`.
4. Execute Phase 0 (Contracts-first).
5. For UI-bearing targets, normalize discussion UIUX artifacts into design/ui contracts for downstream execution.
6. Execute Phase 1 (Outline).
7. Ensure `_policies/11_Slice-Policy.md` exists and matches the current slicing model.
8. Execute Phase 2 (Slice) and pass slice gate for each target spec.
9. Execute Phase 3 (Plan finalize) after at least one slice gate passes.
10. Execute Phase 4 (Delta update).
11. Run `qfai validate --profile sdd --fail-on error --format github | tee .qfai/report/validate.log`.
12. Review `.qfai/report/specs-coverage/spec-*.md` and triage density-smell warnings.
13. If validate fails, fix source-layer artifacts and repeat until `error=0`.

Use:

- `.qfai/assistant/skills/qfai-sdd/references/sdd-execution-playbook.md`
- `.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`

for detailed entry conditions, stop conditions, and artifact-by-artifact execution notes.

## Unified SDD Quality Gate

Run the quality gate checklist from `.qfai/assistant/skills/qfai-sdd/references/sdd-quality-gate.md`.

Minimum checks that must remain visible here:

- Confirm required `_policies` and `spec-XXXX` layered files exist.
- Confirm `_policies/11_Slice-Policy.md` matches the repository's current slice model.
- Confirm `_policies/04_Business-Flow.md` includes Mermaid.
- Confirm `01_Spec.md` includes copy-down context and Escalation Hook.
- Confirm required edges `US -> AC -> BR -> EX -> TC`.
- Confirm `10_Plan.md` exists and remains How-only.
- Confirm `specs/plan.md` does not exist.
- Confirm validate exits with `error=0`.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/sdd-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Preflight summary path
- Open questions summary
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Validate evidence paths
- Work Orders Summary
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs and spec-id
- Confirmation of phase order: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update
- Decision record IDs touched in `09_delta.md` (or `*_delta.md`)
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Unified SDD quality gate result

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `.qfai/report/preflight_summary.md` was generated before spec authoring.
- [ ] Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update order was preserved.
- [ ] `_policies/05_Contracts.md` Contract Index and `.qfai/contracts/**` declarations are aligned.
- [ ] Upper-to-lower references were not introduced.
- [ ] At least one user-story slice passed gate before plan finalization.
- [ ] Required `_policies` + `spec-XXXX` outputs exist and are internally consistent.
- [ ] `_policies/11_Slice-Policy.md` exists and reflects the current slicing model.
- [ ] `_policies/04_Business-Flow.md` is Markdown + Mermaid.
- [ ] `10_Plan.md` is finalized as How-only.
- [ ] `specs/plan.md` was not created.
- [ ] `09_delta.md` (or `*_delta.md`) contains adoption/rejection rationale.
- [ ] `qfai validate --profile sdd --fail-on error --format github` ran and produced `error=0`.
- [ ] `.qfai/report/specs-coverage/spec-*.md` was reviewed.
- [ ] Quality gate checks are recorded in evidence.
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated.
- [ ] Open questions were logged to the proper OQ file.
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-prototyping`.
  Action: build contract-aligned skeleton implementation before deeper coding.
- Test-first path: `/qfai-atdd`.
  Action: implement acceptance tests from the finalized spec pack.
- Contracts status:
  Action: confirm contracts were created or updated under `.qfai/contracts/**` and referenced by `_policies/05_Contracts.md`.
- Spec pack needs correction: rerun `/qfai-sdd`.
  Action: fix layered `_policies + spec-XXXX` consistency and decision records, then regenerate evidence.
