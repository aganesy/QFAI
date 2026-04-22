---
name: qfai-prototyping
title: QFAI Prototyping (Skill-Orchestrated)
description: "Build a contract-aligned UI prototype, run agent-led visual evaluation, and gate completion through validate/verify."
argument-hint: "[--mode low-cost|standard|full-harness] [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    product-experience-architect,
    frontend-engineer,
    backend-engineer,
    devops-ci-engineer,
    completion-reviewer,
    product-surface-reviewer,
    qa-gatekeeper,
  ]
routing-profile: ui-surface-aware
mode: execution-focused
---

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

This skill owns prototyping orchestration directly.
Do not rely on a CLI entrypoint or package runtime loop.

## CRITICAL CONSTRAINTS (Read First)

- Scope is all specs from `.qfai/specs/spec-*`.
- Screenshot evidence and HTML snapshot evidence are mandatory.
- Screenshot evidence path: `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
- HTML snapshot path: `.qfai/evidence/prototyping/html/<screen-id>.html`
- If either screenshot or HTML is missing for a declared screen, that screen scores `0` and the run is incomplete.
- Optional evidence is abolished. Missing mandatory evidence must trigger rerun, not waiver.
- Mode is selected only from this skill's `--mode` argument. If omitted, default to `standard`.
- Supported modes and iteration caps are:
  - `low-cost`: 1 iteration
  - `standard`: 3 iterations
  - `full-harness`: 20 iterations
- DONE is forbidden until `qfai validate --fail-on error` passes and `/qfai-verify` can approve the run.
- Supported UI prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
- `cli`, API-only, backend-only, and `ui_bearing: false` classifications are not prototyping execution targets.
- Canonical screen contracts in `.qfai/contracts/ui/*.yaml` are mandatory.
- Evaluation is performed by sub-agents; machine checks are limited to schema/evidence validation.
- Evaluation uses 3-layer item scoring only. L1/L2 panels and weightedTotal are forbidden.
- Evaluation completion is reached when every evaluation reviewer scores every axis at `>=95`, or when the mode iteration cap is reached.

## Goal

Build the minimum runnable slice for all specs and produce reviewable screenshot/HTML evidence for every declared screen.

## Required References

Read and follow these references before execution:

- `.qfai/assistant/skills/qfai-prototyping/references/evidence-requirements.md`
- `.qfai/assistant/skills/qfai-prototyping/references/iteration-cycle.md`
- `.qfai/assistant/skills/qfai-prototyping/references/design-system-compliance.md`
- `.qfai/assistant/skills/qfai-prototyping/references/reviewer-gate.md`

## Delegation Scope Table

All sub-agent delegation in this skill MUST follow the category-to-role mapping below.
Assigning a task to a role not listed for the category is a violation and MUST be flagged.

| Category           | Allowed Role(s)                                        |
| ------------------ | ------------------------------------------------------ |
| UI implementation  | frontend-engineer, product-experience-architect        |
| Screenshot capture | devops-ci-engineer                                     |
| Evaluation scoring | product-surface-reviewer, product-experience-architect |
| Build              | devops-ci-engineer, backend-engineer                   |

Any delegation map entry that assigns a category to an undefined or unlisted role MUST produce a violation finding naming the undefined role and the category.

## Required Process

### Step 0 — Execution Plan

Before any code is written, create an execution plan record in the work evidence.

Required fields:

- `mode`: `low-cost | standard | full-harness`
- `targetIterations`: integer; use the mode cap (1/3/20)
- `evaluationAxesSource`: ref to `.qfai/contracts/design/evaluation-axes.yaml`
- `delegationMap`: category-to-role assignments per Delegation Scope Table
- `plannedAt`: ISO-8601 timestamp

### Step 1 — Read Inputs

Read the downstream-ready spec/contract inputs and verify:

- `.qfai/specs/<spec-id>/01_Spec.md`
- `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
- `.qfai/contracts/design/evaluation-axes.yaml`
- `.qfai/contracts/design/anchor-selection.yaml`
- `.qfai/contracts/design/design-system.yaml` when required by the spec
- `.qfai/contracts/ui/*.yaml`

Read order:

1. `.qfai/specs/<spec-id>/01_Spec.md`
2. `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
3. `.qfai/contracts/design/anchor-selection.yaml`
4. `.qfai/contracts/design/evaluation-axes.yaml`
5. `.qfai/contracts/design/design-system.yaml`
6. `.qfai/contracts/ui/*.yaml`

### Step 2 — Verify Execution Preconditions

Confirm all of the following before any evaluation:

- classification is UI-bearing
- surface is `web`, `mobile`, `desktop`, or `mixed`
- every declared screen has a stable `screen-id`
- the design evaluation contract satisfies the required schema
- the design system checklist is available when required

### Step 3 — Implement the Minimum Runnable Slice

Implement the smallest UI slice that covers all declared screens and primary interactions.

### Step 4 — Capture Mandatory Evidence

For every declared screen:

- capture one screenshot and store it at the canonical screenshot path
- capture one HTML snapshot and store it at the canonical HTML path
- record missing evidence immediately; do not continue as if capture succeeded

### Step 5 — Launch Evaluation Reviewers

Launch evaluation reviewer sub-agents with the full context bundle:

- screenshots from Step 4
- HTML snapshots from Step 4
- `axisDefs` from `.qfai/contracts/design/evaluation-axes.yaml`
- `previousScore` from the prior iteration (`null` for iteration 1)
- `designSystemChecklist` from `.qfai/contracts/design/design-system.yaml`

If any required input is missing, stop the evaluation and classify the screen as `0` points with rerun required.

Each evaluation reviewer MUST:

- score every invariant axis from `0..100`
- score every trend-derived axis from `0..100`
- score every product-specific axis from `0..100`
- include rationale and evidence refs for every score

### Step 6 — Aggregate Findings

Aggregate reviewer findings and classify them as:

- blocking
- immediate-fix
- revise
- manual-review

### Step 7 — Fix and Re-capture

Apply fixes per finding disposition, then re-capture screenshot and HTML evidence for every changed screen.
Do not close a finding without fresh evidence.

### Step 8 — Re-evaluate

Repeat Steps 4–7 until:

- all declared screens have screenshot + HTML evidence
- every evaluation reviewer has scored every axis
- either all axis scores are `>=95` across all evaluation reviewers, or the mode iteration cap is reached
- validate can pass on required schema/evidence gates

### Step 9 — Validate and Verify

- Run `qfai validate --fail-on error`.
- Route `/qfai-verify` or its equivalent gate workflow for final quality approval.
- Do not declare completion until the reviewer result is `PASS`.

## Evaluator Inputs (Mandatory)

When launching any evaluation reviewer sub-agent, all 5 elements MUST be present:

1. screenshots
2. HTML snapshots
3. axisDefs
4. previousScore
5. designSystemChecklist

## Visual Quality Structural Checklist

Each iteration evaluation MUST score all 6 visual categories:

1. Color
2. Typography
3. Spacing
4. Border radius
5. Shadow
6. Do's&Don'ts

### Reviewer Gate (MUST)

Reviewer checks are defined in:

- `.qfai/assistant/skills/qfai-prototyping/references/reviewer-gate.md`

Minimum reviewer responsibilities:

- verify mandatory screenshot/HTML evidence exists for every declared screen
- verify 3-layer evaluation references were used
- verify missing evidence caused rerun rather than waiver
- verify `qfai validate --fail-on error` completed successfully
- verify Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`
- verify iteration completion used either `all-items-pass-95` or the mode cap
- return `Result: PASS | REVISE`

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- do not self-approve
- keep evidence paths canonical
- integrate delegated results only

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE)` column, reviewer response `Result: PASS | REVISE`).

## Completion Contract (Shared)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#completion-contract-shared`.

Prototyping-specific additions:

- all specs are covered
- all declared screens have screenshot + HTML evidence
- `qfai validate --fail-on error` passes
- reviewer returns `PASS`

## FINAL CHECKLIST (Check Last)

- All specs are covered in the Coverage Matrix.
- Every declared screen has screenshot evidence.
- Every declared screen has HTML evidence.
- Missing evidence triggered rerun instead of waiver.
- Reviewer returned PASS; otherwise status is REVISE.

## Completion Message & Next Actions (MUST)

Action:

- Proceed: `/qfai-atdd`
- Quality gate: `/qfai-verify`
- Rework prototyping: rerun `/qfai-prototyping` with corrected screenshot/HTML evidence
