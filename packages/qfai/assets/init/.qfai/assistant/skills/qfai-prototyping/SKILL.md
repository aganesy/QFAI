---
name: qfai-prototyping
title: QFAI Prototyping (Lightweight HTML Exploration Harness)
description: "Run a lightweight static-first HTML prototype funnel with visual evaluation, handoff extraction, and implementation-ready design evidence."
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

- Scope is ALL specs from `.qfai/specs/spec-*`.
- Prototyping is static-first and file-based by default: build lightweight HTML/CSS/JS prototypes under `.qfai/prototypes/`.
- Do not implement candidate prototypes in production `src/`, app routes, or the target runtime stack unless static HTML cannot represent the decision; record the exception rationale.
- The prototype optimizes visual direction, UI/UX, screen transitions, state coverage, and handoff clarity. Production implementation belongs to `/qfai-implement`.
- Playwright CLI (`playwright-cli`) is the sole standard browser tool. Use the preflight-resolved launcher, such as `npx --no-install playwright-cli` or `node_modules/.bin/playwright-cli`; do not hardcode local paths into evidence.
- QFAI pre-assigns evidence paths. The evaluator MUST use the paths in `review-bundle.json` and `command-plans.json`; it MUST NOT invent paths.
- For every declared screen and every active candidate in every round, screenshot, HTML snapshot, accessibility snapshot, and command log evidence are mandatory.
- Canonical latest screenshot path: `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
- Canonical latest HTML path: `.qfai/evidence/prototyping/html/<screen-id>.html`
- `prototype-handoff.yaml`, `selected-direction.yaml`, and `design-system.yaml` are required before completion review.
- Supported UI prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
- `cli`, API-only, backend-only, and `ui_bearing: false` classifications are not execution targets for prototyping.
- Mode differences are limited to `maxCycles` only: low-cost=1, standard=3, full-harness=20.
- Direction funnel completion is not stage completion. At least one post-selection polish cycle is mandatory.
- Each exploration round (`r5`, `r3`, `r2`, `r1`) and each post-selection `polish` or `branch` cycle MUST end with a git commit and a recorded `commitSha`.
- Completion requires every reviewer sub-agent to score every evaluation axis at `100/100`; `95` is not a completion border.
- DONE is forbidden until `qfai validate --profile prototyping --fail-on error` passes and `/qfai-verify` can approve the run.

## Goal

Generate multiple lightweight prototype directions, converge on a polished winner, extract implementation handoff contracts, and preserve enough visual evidence for `/qfai-implement` to reproduce the design without copying prototype-only code.

## Surface / Mode

- `standard` is the default mode.
- Modes differ only by `maxCycles`. No mode weakens evidence, reviewer, handoff, or completion obligations.
- Surface framing rules live in `.qfai/assistant/skills/qfai-prototyping/references/surface-framing.md`.

## Required References

Read and follow these references before execution:

- Primary SSOT: run `qfai prototyping show-spec` from the repo root and read the returned `01_Spec.md`.
- `.qfai/assistant/skills/qfai-prototyping/references/prototype-workspace.md`
- `.qfai/assistant/skills/qfai-prototyping/references/surface-framing.md`
- `.qfai/assistant/skills/qfai-prototyping/references/evidence-requirements.md`
- `.qfai/assistant/skills/qfai-prototyping/references/iteration-cycle.md`
- `.qfai/assistant/skills/qfai-prototyping/references/l1-review-guide.md`
- `.qfai/assistant/skills/qfai-prototyping/references/l2-review-guide.md`
- `.qfai/assistant/skills/qfai-prototyping/references/design-system-compliance.md`
- `.qfai/assistant/skills/qfai-prototyping/references/reviewer-gate.md`
- `.qfai/assistant/steering/test-layers.md`

Contract inputs:

1. `.qfai/specs/<spec-id>/01_Spec.md`
2. `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
3. `.qfai/contracts/design/exploration-brief.yaml`
4. `.qfai/contracts/design/evaluation-rubric.yaml`
5. `.qfai/contracts/design/evaluator-calibration.yaml`
6. `.qfai/contracts/design/anchor-selection.yaml` when legacy validator slices are exercised
7. `.qfai/contracts/design/evaluation-axes.yaml` when legacy validator slices are exercised
8. `.qfai/contracts/design/selected-direction.yaml` when already created
9. `.qfai/contracts/design/design-system.yaml` when already created
10. `.qfai/contracts/design/prototype-handoff.yaml` when already created
11. `.qfai/contracts/ui/*.yaml`

## Delegation Scope Table

All sub-agent delegation MUST follow this category-to-role mapping.

| Category                           | Allowed Role(s)                                        |
| ---------------------------------- | ------------------------------------------------------ |
| UI implementation                  | frontend-engineer, product-experience-architect        |
| Playwright CLI execution & capture | devops-ci-engineer                                     |
| Evaluation scoring                 | product-surface-reviewer, product-experience-architect |
| Build                              | devops-ci-engineer, backend-engineer                   |
| Breakthrough planning              | product-experience-architect, frontend-engineer        |

Any delegation map entry that assigns a category to an undefined or unlisted role MUST produce a violation finding naming the undefined role and the category.

## Required Process

### Step 0 - Execution Plan

Before any prototype files are written, create an execution plan record in work evidence.

Required fields:

- `targetRounds`: ordered array; default funnel is `["r5", "r3", "r2", "r1"]`
- `funnelPolicy`: `5->3->2->1`
- `evaluationAxesSource`: ref to `.qfai/contracts/design/evaluation-rubric.yaml`
- `delegationMap`: category-to-role assignments per Delegation Scope Table
- `plannedAt`: ISO-8601 timestamp

### Step 1 - Read Inputs

Read the Required References and Contract Inputs in order. Verify the prototype will answer the screen, state, transition, and visual questions rather than prematurely implementing production code.

### Step 2-A — Verify Contract Preconditions

Confirm all of the following before any evaluation:

- classification is UI-bearing
- surface is `web`, `mobile`, `desktop`, or `mixed`
- every declared screen has a stable `screen-id`
- exploration brief, evaluation rubric, and evaluator calibration contracts satisfy the required schema

### Step 2-B — Verify Environment Preconditions

Run `qfai prototyping preflight --target-url <url>` when a concrete target URL is known, or `qfai doctor --profile prototyping` to diagnose the same runtime assumptions from config.

Confirm:

- required agent wrappers and canonical role cards are available
- `qfai doctor --profile prototyping` resolves a runnable Playwright CLI launcher
- the prototype target URL responds with HTTP 200-399 before capture starts
- failed first delegation stops the stage; do not simulate roles

### Step 3 - Generate Divergent Directions

Generate 5 clearly distinct static HTML/CSS/JS prototype directions under `.qfai/prototypes/rounds/r5/candidates/<candidate-id>/`.
Do not begin with a single incumbent direction.

### Step 4 - Round Start

Serve the active prototype candidates through a local target URL, then run:

`qfai prototyping round-start --round <rN> --candidates <csv> --target-url <url> --mode <mode>`

QFAI produces `command-plans.json` and `review-bundle.json`. Do not handwrite these files.

### Step 5 - Capture Evidence

For every declared screen of every active candidate, the capture role:

1. Reads `command-plans.json`.
2. Applies the preflight-resolved Playwright CLI launcher to each logical command.
3. Writes stdout to `stdoutPath` when the plan marks output as stdout-backed.
4. Performs interaction commands to exercise `primaryTasks`.
5. Saves the executed transcript to `<candidate-path>/<screen-id>.commands.json`.

If any capture step fails, the capture role records the failure, fixes local causes such as launcher, server, URL, command-plan, or path issues, and reruns capture. Do not pretend the screen was evaluated until the required artifacts exist.

### Step 6 - Launch Evaluation Reviewers

Launch evaluation reviewer sub-agents with `review-bundle.json`.
Inputs include screenshots, HTML snapshots, accessibility snapshots, command logs, `axisDefs`, `previousScore`, `designSystemChecklist`, and `commandPlanRef`.
Persist per-candidate reviews to `evaluator-reviews/<candidate-id>.json` with concrete `evidenceRefs[]`.

### Step 7 - Direction Funnel

Run the convergence funnel:

- `r5`: 5 directions -> top 3
- `r3`: top 3 remixed -> top 2
- `r2`: top 2 -> selected winner `r1`

For each harvestable round, run `round-harvest`, `round-narrow`, and `round-absorb` as defined in `iteration-cycle.md`. Commit each completed round and record `commitSha` in `prototyping.json`.

### Step 8 - Extract Winner Contracts

After first winner selection, write:

- `.qfai/contracts/design/selected-direction.yaml`
- `.qfai/contracts/design/design-system.yaml`
- `.qfai/contracts/design/prototype-handoff.yaml`
- `.qfai/prototypes/winner/index.html`

`prototype-handoff.yaml` must describe what `/qfai-implement` must preserve, may adapt, and must not copy.

### Step 9 - Polish Winner

Run at least one post-selection polish loop: critique, prototype fix, re-capture, re-review, breakthrough check, commit, and `commitSha` recording.
Keep best-of-history; the latest iteration is not automatically best.

### Step 10 - Breakthrough Detection

After each polish iteration, run the mechanical breakthrough detector. If score improvement and code-change signals plateau before perfect reviewer scores, branch exactly 2 alternative prototype directions and compare incumbent + branches.

### Step 11 - Validate and Verify

- Run `qfai validate --profile prototyping --fail-on error`.
- Route `/qfai-verify` or equivalent gate workflow.
- Do not declare completion until the independent reviewer returns `PASS`.

## Evaluator Inputs (Mandatory)

Evaluation reviewer sub-agents MUST read `review-bundle.json` for the current round and use these inputs:

1. screenshots
2. HTML snapshots
3. accessibility snapshots
4. Playwright CLI command logs
5. `axisDefs` from `.qfai/contracts/design/evaluation-rubric.yaml`
6. `previousScore` when available
7. `designSystemChecklist` from `.qfai/contracts/design/design-system.yaml`
8. `commandPlanRef`
9. prototype source refs under `.qfai/prototypes/`

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
- verify static prototype source, selected-direction, design-system, and prototype-handoff exist
- verify missing evidence caused rerun rather than waiver
- verify best-of-history, breakthrough, and at least one post-selection polish loop
- verify every reviewer sub-agent scored every evaluation axis at `100/100`
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
Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

Prototyping-specific additions:

- all specs are covered
- all declared screens have 4 artifacts per active candidate / round
- canonical latest paths mirror the latest accepted winner/polish state
- static prototype source exists under `.qfai/prototypes/`
- `review-bundle.json`, `command-plans.json`, and evaluator reviews exist for every round
- `selected-direction.yaml`, `design-system.yaml`, and `prototype-handoff.yaml` exist
- `bestOfHistory` and `breakthrough` sections present in `prototyping.json`
- at least one post-selection polish cycle completed
- independent reviewer gate returned `PASS`
- `qfai validate --profile prototyping --fail-on error` passes

## FINAL CHECKLIST (Check Last)

- ALL specs are covered in the Coverage Matrix.
- Static prototype source is under `.qfai/prototypes/`; production code was not used for candidate exploration.
- Every declared screen has screenshot, HTML snapshot, accessibility snapshot, and command log evidence.
- Canonical latest paths mirror the latest accepted winner/polish artifacts.
- Direction funnel `5->3->2->1` completed.
- At least one post-selection polish cycle completed with critique/fix/re-capture/re-review/breakthrough checks.
- `prototype-handoff.yaml` captures must-preserve, may-adapt, and must-not-copy guidance for `/qfai-implement`.
- Every reviewer sub-agent scored every evaluation axis at `100/100`.
- Independent reviewer returned PASS; otherwise status is REVISE.

## Completion Message & Next Actions (MUST)

Action:

- Proceed: `/qfai-atdd`
- Implement with prototype handoff: `/qfai-implement`
- Quality gate: `/qfai-verify`
- Rework prototyping: rerun `/qfai-prototyping` with corrected prototype and screenshot/HTML evidence
