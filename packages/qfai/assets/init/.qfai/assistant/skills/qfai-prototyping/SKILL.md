---
name: qfai-prototyping
title: QFAI Prototyping (Exploration-First Harness)
description: "Run a planner/generator/evaluator UI harness with a 5→3→2→1 direction funnel, breakthrough detection, and final design-system extraction."
argument-hint: "[--auto]"
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
- DONE is forbidden until `qfai validate --fail-on error` passes and `/qfai-verify` can approve the run.
- Supported UI prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
- `cli`, API-only, backend-only, and `ui_bearing: false` classifications are not prototyping execution targets.
- `cli` is not supported and is not an execution target for prototyping.
- Evaluation is performed by sub-agents; machine checks are limited to schema/evidence validation and breakthrough trigger detection.
- Shared evidence vocabulary includes `render.json`, `browser-qa.json`, `prototyping.json`, and `breakthrough.json`.
- static-first evidence capture remains mandatory even when interactive review is used.

## Goal

Generate multiple design directions, converge on a winner, extract the selected direction and final design system, and keep the winner open to breakthrough pivots during later polish iterations.

## Surface / Mode

- surface / mode routing uses `standard` as the default execution path.
- `standard` is the default when no explicit escalation to `full-harness` is requested.
- `full-harness` is reserved for explicit escalation and review-heavy obligations.

## Required References

Read and follow these references before execution:

- `.qfai/assistant/skills/qfai-prototyping/references/evidence-requirements.md`
- `.qfai/assistant/skills/qfai-prototyping/references/iteration-cycle.md`
- `.qfai/assistant/skills/qfai-prototyping/references/l1-review-guide.md`
- `.qfai/assistant/skills/qfai-prototyping/references/l2-review-guide.md`
- `.qfai/contracts/design/anchor-selection.yaml` when legacy validator slices are exercised
- `.qfai/contracts/design/evaluation-axes.yaml` when legacy validator slices are exercised
- `.qfai/assistant/skills/qfai-prototyping/references/design-system-compliance.md`
- `.qfai/assistant/skills/qfai-prototyping/references/reviewer-gate.md`
- `.qfai/assistant/steering/test-layers.md`

## Delegation Scope Table

All sub-agent delegation in this skill MUST follow the category-to-role mapping below.
Assigning a task to a role not listed for the category is a violation and MUST be flagged.
Evaluation scoring and screenshot capture must use only the allowed roles below.

| Category              | Allowed Role(s)                                        |
| --------------------- | ------------------------------------------------------ |
| UI implementation     | frontend-engineer, product-experience-architect        |
| Screenshot capture    | devops-ci-engineer                                     |
| Evaluation scoring    | product-surface-reviewer, product-experience-architect |
| Build                 | devops-ci-engineer, backend-engineer                   |
| Breakthrough planning | product-experience-architect, frontend-engineer        |

Any delegation map entry that assigns a category to an undefined or unlisted role MUST produce a violation finding naming the undefined role and the category.

## Required Process

### Step 0 — Execution Plan

Before any code is written, create an execution plan record in the work evidence.

Required fields:

- `targetIterations`: integer; minimum 2
- `funnelPolicy`: `5->3->2->1`
- `evaluationAxesSource`: ref to `.qfai/contracts/design/evaluation-rubric.yaml`
- `delegationMap`: category-to-role assignments per Delegation Scope Table
- `plannedAt`: ISO-8601 timestamp

### Step 1 — Read Inputs

Read the downstream-ready spec/contract inputs and verify:

- `.qfai/specs/<spec-id>/01_Spec.md`
- `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/discussion/discussion-*/uiux/31_reference_pool.md`
- `.qfai/contracts/design/evaluation-rubric.yaml`
- `.qfai/contracts/design/evaluator-calibration.yaml`
- `.qfai/contracts/design/anchor-selection.yaml` when legacy validator slices are exercised
- `.qfai/contracts/design/evaluation-axes.yaml` when legacy validator slices are exercised
- `.qfai/contracts/design/selected-direction.yaml` when already created
- `.qfai/contracts/design/design-system.yaml` when already created
- `.qfai/contracts/ui/*.yaml`

Read order:

1. `.qfai/specs/<spec-id>/01_Spec.md`
2. `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
3. `.qfai/contracts/design/exploration-brief.yaml`
4. `.qfai/discussion/discussion-*/uiux/31_reference_pool.md`
5. `.qfai/contracts/design/evaluation-rubric.yaml`
6. `.qfai/contracts/design/evaluator-calibration.yaml`
7. `.qfai/contracts/design/anchor-selection.yaml` (legacy validator alias, when present)
8. `.qfai/contracts/design/evaluation-axes.yaml` (legacy validator alias, when present)
9. `.qfai/contracts/design/selected-direction.yaml`
10. `.qfai/contracts/design/design-system.yaml`
11. `.qfai/contracts/ui/*.yaml`

### Step 2 — Verify Execution Preconditions

Confirm all of the following before any evaluation:

- classification is UI-bearing
- surface is `web`, `mobile`, `desktop`, or `mixed`
- every declared screen has a stable `screen-id`
- the exploration brief, evaluation rubric, and evaluator calibration contracts satisfy the required schema

### Step 3 — Generate Divergent Directions

Generate 5 clearly distinct design directions before selecting a winner.
Do not begin with a single incumbent direction.

### Step 4 — Capture Mandatory Evidence

For every declared screen and every active direction:

- capture one screenshot and store it at the canonical screenshot path
- capture one HTML snapshot and store it at the canonical HTML path
- record missing evidence immediately; do not continue as if capture succeeded

### Step 5 — Launch Evaluation Reviewers

Launch evaluation reviewer sub-agents with the full context bundle:

- screenshots from Step 4
- HTML snapshots from Step 4
- `axisDefs` from `.qfai/contracts/design/evaluation-rubric.yaml`
- `previousScore` from the prior iteration (`null` for iteration 1)
- `designSystemChecklist` from `.qfai/contracts/design/design-system.yaml`

### Step 6 — Direction Funnel

Run the mandatory convergence funnel:

- 5 directions -> top 3
- top 3 remixed -> top 2
- top 2 -> selected winner 1

### Step 7 — Extract Winner Contracts

After the first winner is selected:

- write `.qfai/contracts/design/selected-direction.yaml`
- extract `.qfai/contracts/design/design-system.yaml`

### Step 8 — Polish the Winner

Iterate on the selected winner with normal critique/rework loops.
Do not assume the latest iteration is automatically best; keep best-of-history in evidence.

## Iteration Gate

- Minimum 2 iterations are required before any terminal phase transition is allowed.
- Do not mark the run as converged or complete after a single iteration.
- Any phase transition to completion must pass through the iteration gate and reviewer gate.

### Step 9 — Breakthrough Detection

After each polish iteration, run the mechanical breakthrough detector.
If `allItemsPass95` is false and score improvement is below the configured plateau threshold and code change is below the configured diff threshold, trigger breakthrough branching.

### Step 10 — Breakthrough Branch Loop

When breakthrough is triggered:

- generate exactly 2 branch directions
- compare incumbent + 2 branches
- replace the mainline if a branch wins
- refresh selected-direction/design-system if the winner changes
- record the decision in `.qfai/evidence/breakthrough.json`

### Step 11 — Validate and Verify

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

1. Design quality
2. Originality
3. Craft
4. Functionality
5. Accessibility risk
6. Implementation plausibility

### Reviewer Gate (MUST)

Reviewer checks are defined in:

- `.qfai/assistant/skills/qfai-prototyping/references/reviewer-gate.md`
- `.qfai/assistant/steering/test-layers.md`

Minimum reviewer responsibilities:

- enforce the Drift Protocol before approving a completion transition
- verify mandatory screenshot/HTML evidence exists for every declared screen
- verify exploration brief, evaluation rubric, and evaluator calibration were used
- verify missing evidence caused rerun rather than waiver
- verify `qfai validate --fail-on error` completed successfully
- verify breakthrough trigger evidence is present
- verify best-of-history handling is documented
- treat score/volume heuristics as signals, not gates
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
- `selected-direction.yaml` exists
- `design-system.yaml` exists
- `breakthrough.json` exists
- `qfai validate --fail-on error` passes
- reviewer returns `PASS`

## FINAL CHECKLIST (Check Last)

- All specs are covered in the Coverage Matrix.
- Every declared screen has screenshot evidence.
- Every declared screen has HTML evidence.
- Missing evidence triggered rerun instead of waiver.
- Direction funnel `5->3->2->1` completed.
- Breakthrough detector ran after polish iterations.
- Reviewer returned PASS; otherwise status is REVISE.

## Completion Message & Next Actions (MUST)

Action:

- Proceed: `/qfai-atdd`
- Quality gate: `/qfai-verify`
- Rework prototyping: rerun `/qfai-prototyping` with corrected screenshot/HTML evidence
