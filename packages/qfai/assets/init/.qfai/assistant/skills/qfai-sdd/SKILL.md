---
name: qfai-sdd
title: QFAI SDD Unified (Triage/Outline/Slice/Plan/Delta)
description: "Triage incoming requirements against existing specs, then create or update layered SDD artifacts (_policies + spec-*) in one workflow."
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

## Stage and Phase Order (Fixed)

```
Stage 0 Preflight  -> Stage 1 Triage  -> Phase 0 Contracts-first
                  -> Phase 1 Outline -> Phase 2 Slice (per spec)
                  -> Phase 3 Plan finalize -> Phase 4 Delta update
```

- Detailed sequencing: `references/sdd-execution-playbook.md`.
- Per-stage checklists: `references/sdd-phase-checklists.md`.

## Stage 0: Preflight (Mandatory)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.
Stop if the latest discussion-pack is missing, incomplete, or has blocking OQ.
On validate / doctor / quality-gate failures, follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`.

## Stage 1: Triage (Mandatory)

Before any spec edit:

1. Enumerate active spec summaries (skip `superseded` / `deprecated` / `removed`).
2. Classify each REQ/NFR into one of the 8 operations using `_policies/11_Slice-Policy.md`:
   - **CREATE / DELETE / SPLIT / MERGE / SUPERSEDE** (top-level, approval required)
   - **UPDATE: APPEND / MODIFY / REMOVE** (UPDATE:REMOVE also requires approval)
3. Obtain AskUserQuestion approval for every approval-required row.
4. Persist the Triage table in `<spec>/09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec / policy).

Procedure: `references/sdd-triage.md`. Validators: `QFAI-TRIAGE-001..005`.

## Spec Status Field (Mandatory)

Every `01_Spec.md` declares `- Status: active | superseded | deprecated | removed`.

- `superseded` requires `- Superseded-by: spec-NNNN` pointing to an existing spec.
- `deprecated` / `removed` require `- Deprecated-at: YYYY-MM-DD`.
- Triage classification ignores non-active specs.

Validators: `QFAI-STATUS-001..006`.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
Approval-required ops in Stage 1 above MUST go through AskUserQuestion.

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#format-ssot-mandatory`.
- Read before writing `.qfai/**`:
  - `.qfai/assistant/skills/qfai-discussion/references/discussion-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/contract-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`
  - `.qfai/assistant/skills/qfai-prototyping/references/evidence-requirements.md`
  - `.qfai/assistant/steering/agent-catalog.yml`
  - `.qfai/assistant/steering/agent-routing.yml`
  - `.qfai/assistant/steering/review-profiles.yml`

## Inputs Priority

1. Latest `.qfai/discussion/discussion-*/` pack (lexicographically largest), validated by Stage 0.
2. P1: `.qfai/assistant/instructions/*`
3. P2: `.qfai/assistant/steering/*`
4. P3: existing `.qfai/specs/_policies/03_Capabilities.md` + active spec summaries (Stage 1 input)
5. P4: existing `.qfai/specs/<spec-id>/**` for the targeted specs
6. P5: `.qfai/discussion/**`, `.qfai/contracts/**`

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides beyond the baseline.

### Capability Probe (MUST)

- No additional overrides beyond the baseline.

### Delegation Failure (Hard Stop)

- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

Stage minimum roles:

- `requirements-analyst` drafts requirement-aligned spec content.
- `solution-architect` drafts structural / contract / architecture sections.
- `test-design-analyst` drafts traceability, examples, and test-design.
- `product-experience-architect` is added when the target is UI-bearing.
- `orchestrator` integrates outputs and presents for confirmation; never drafts the primary artifact and never self-approves.
- `completion-reviewer` is delegated independently. Required field: `Status (PASS/REVISE)`.

Reviewer routing is fixed by `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.

### Reviewer Gate (MUST)

- Default: `completion-reviewer`.
- Conditional: `architecture-reviewer` (structural / contract / CLI), `product-surface-reviewer` (UI-bearing), `qa-gatekeeper` (validate / coverage / runtime / prototyping evidence affected).
- Do not declare DONE until all routed blocking reviewers return `PASS`.

### No-argument batch delegation (MUST)

- Without argument: target all capabilities in `_policies/03_Capabilities.md`.
- Run Contracts-first and Outline once per batch.
- Delegate Slice in parallel per spec.
- Validate gate and Review gate run once at batch tail after all target specs are integrated.

## Work Orders Summary

Per-spec evidence at `.qfai/evidence/sdd-<spec-id>.md` is mandatory and MUST include `## Work Orders Summary`. Use the shared schema from `shared-skill-delegation-baseline.md`.

## Review Cycle Protocol (RCP)

- Follow `references/review-cycle-playbook.md`.
- Footer SSOT: `references/rcp_footer.md`.
- Allowed reviewer verdicts: `PASS` and `FAIL`.

## Workflow Convention

- Phase order is fixed (see top).
- Reference direction: lower-to-upper only; upper-to-lower references are forbidden.
- Required edges `US -> AC -> BR -> EX -> TC` must be present.
- Plan finalize MUST happen after at least one user-story slice is grounded.
- Unresolved items MUST move to shared or spec open-question files.

## Delta Rejected Guard (Mandatory)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`.

## Slice Policy Protocol

- `_policies/11_Slice-Policy.md` is the SSOT for the 8 ops and ID stability rules.
- If missing or stale, refresh it before continuing.
- Do not start Phase 2 (Slice) until Stage 1 Triage is complete.

## Arguments and Target Selection (Mandatory)

- With argument (`/qfai-sdd <spec-id-or-name> [--auto]`): update only the matched single spec target.
- Without argument (`/qfai-sdd`): target all capabilities listed in `_policies/03_Capabilities.md`.
- Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.

## Critical Constraints

1. Use only skill-local templates under `.qfai/assistant/skills/qfai-sdd/templates/contracts`, `templates/report`, and `templates/specs`.
2. Always write `.qfai/report/preflight_summary.md` before generating shared/spec artifacts.
3. Contracts-first is mandatory; UI-bearing targets must be normalized into `.qfai/contracts/design/**` and `.qfai/contracts/ui/**` per `references/ui-design-contract-normalization.md`.
4. `_policies/05_Contracts.md` must include a Contract Index aligned with `.qfai/contracts/**`.
5. `_policies/04_Business-Flow.md` must be Markdown with Mermaid `flowchart` or `sequenceDiagram`.
6. `05_Examples.md` must include `EX-ID` and `BR-Ref` mappings.
7. `06_Test-Cases.md` must include `TC-ID`, `EX-Ref`, `AC-Refs`, and `Type`, with normal-path plus error/boundary coverage.
8. Stop only when `qfai validate --profile sdd --fail-on error --format github | tee .qfai/report/validate.log` exits with `error=0`.

## Required Process

1. Stage 0: Preflight (stop on blockers).
2. Stage 1: Triage (classify + approve + persist Triage table).
3. Write `.qfai/report/preflight_summary.md`.
4. Phase 0: Contracts-first (UI-bearing targets normalize in this phase).
5. Phase 1: Outline (`_policies/01..11`).
6. Phase 2: Slice (per spec, gate each).
7. Phase 3: Plan finalize (after at least one slice gate passes).
8. Phase 4: Delta update.
9. Run validate; fix source-layer artifacts and rerun until `error=0`.
10. Triage density-smell warnings in `.qfai/report/specs-coverage/spec-*.md`.

## Mandatory Outputs

- Shared `_policies/01..11` files
- Target `spec-*/01..10` files (with valid `Status:` bullet)
- Triage section in every changed `09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec)
- Updated contracts under `.qfai/contracts/**`; UI-bearing targets normalize design/ui contracts
- `.qfai/report/preflight_summary.md`
- Evidence file: `.qfai/evidence/sdd-<spec-id>.md`

The canonical file set is defined by skill templates under `.qfai/assistant/skills/qfai-sdd/templates/`.

## Quality Gate

Run the full checklist from `references/sdd-quality-gate.md`. The gate also covers status-field and Triage-section checks.

## Evidence

Create `.qfai/evidence/sdd-<spec-id>.md` with: Objective, Inputs reviewed, Preflight summary path, Triage decisions (op + approver per row), Open questions, Decisions made, Work performed, Commands executed, Validate evidence paths, Work Orders Summary, Gaps / Open risks, Final status.

## Done Declaration

When declaring DONE, include:

- Referenced inputs and spec-id(s)
- Stage 1 Triage table digest (counts per Operation, approvals)
- Phase order: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update
- Decision record IDs touched in `09_delta.md`
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Quality gate result and validate log path

## Completion Message & Next Actions

When this skill completes, provide a final user-facing message enumerating next steps:

- Proceed (recommended): `/qfai-prototyping`.
- Test-first path: `/qfai-atdd`.
- Spec pack needs correction: rerun `/qfai-sdd` and regenerate evidence.
- Confirm contracts referenced by `_policies/05_Contracts.md` exist under `.qfai/contracts/**`.
