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
- The AI evaluator sub-agent performs visual evaluation. QFAI does not score visual quality. (per the resolved primary prototyping spec — see `qfai prototyping show-spec`)
- Playwright CLI (`playwright-cli`) is the sole standard browser tool. Playwright MCP, Node Playwright direct invocation, and screenshot-capture shell scripts are not used. (per the resolved primary prototyping spec)
- QFAI pre-assigns evidence paths. The evaluator MUST use the paths in the command plan (`review-bundle.json` → `command-plans.json`); it MUST NOT invent paths.
- For every declared screen and every active candidate in every round, 4 evidence artifacts are mandatory:
  - screenshot: `.qfai/evidence/prototyping/rounds/<round>/candidates/<candidate-id>/<screen-id>.png`
  - HTML: `.qfai/evidence/prototyping/rounds/<round>/candidates/<candidate-id>/<screen-id>.html`
  - accessibility snapshot: `.qfai/evidence/prototyping/rounds/<round>/candidates/<candidate-id>/<screen-id>.snapshot.txt`
  - command log: `.qfai/evidence/prototyping/rounds/<round>/candidates/<candidate-id>/<screen-id>.commands.json`
- Canonical latest screenshot path: `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
- Canonical latest HTML path: `.qfai/evidence/prototyping/html/<screen-id>.html`
- Canonical latest paths MUST mirror the latest accepted winner/polish artifacts.
- If any of the 4 artifacts is missing for a declared screen, the round is incomplete; rerun is mandatory, not waiver.
- Mode differences are limited to `maxCycles` only (low-cost=1, standard=3, full-harness=20). Every other gate, obligation, reviewer severity, and completion criterion is identical across modes. (per the resolved primary prototyping spec)
- DONE is forbidden until `qfai validate --profile prototyping --fail-on error` passes and `/qfai-verify` can approve the run.
- Supported UI prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
- `cli`, API-only, backend-only, and `ui_bearing: false` classifications are not prototyping execution targets.
- Machine checks are limited to schema/evidence validation, mode invariant enforcement, review-cycle completeness, and breakthrough trigger detection.
- Shared evidence vocabulary: `prototyping.json`, `review-bundle.json`, `command-plans.json`, `evaluator-reviews/<candidate-id>.json`, `harvest.json`, `absorption-plan.json`, `reimplementation.json`, `breakthrough.json`.
- Direction funnel completion is not stage completion.
- Selecting the first winner does not satisfy completion. Completion review is forbidden until at least one post-selection polish cycle has completed.
- Completion requires every reviewer sub-agent to score every evaluation axis at `100/100`; `95` is not a completion border.
- Do not use `complete`, `completed`, `done`, or equivalent completion wording in other languages before the completion checklist passes. Use `exploration complete`, `winner selected`, `polishing`, `breakthrough checking`, or `reviewer gate pending` for interim states.

## Goal

Generate multiple design directions, converge on a winner, extract the selected direction and final design system, and keep the winner open to breakthrough pivots during later polish iterations.

## Surface / Mode

- surface / mode routing uses `standard` as the default execution path.
- **Mode Invariant**: modes differ only by `maxCycles`. Review gate, evidence requirements, reviewer severity, best-of-history, breakthrough detection, and completion criteria are identical across modes.
  - `low-cost`: `maxCycles = 1`
  - `standard`: `maxCycles = 3` (default)
  - `full-harness`: `maxCycles = 20`
- No mode weakens obligations. Choosing a lower mode buys fewer chances to iterate, not a looser gate.

## Required References

Read and follow these references before execution:

- **Primary SSOT for the prototyping harness**: resolve at runtime by running
  `qfai prototyping show-spec` from the repo root. The output gives you the
  resolved spec ID and `01_Spec.md` path (configured via
  `qfai.config.yaml: prototyping.primarySpecId`, or auto-detected via the
  `surface_type: ui-bearing` marker in `01_Spec.md`). Do not assume any
  particular spec ID exists — read whatever `show-spec` returns.
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

| Category                           | Allowed Role(s)                                        |
| ---------------------------------- | ------------------------------------------------------ |
| UI implementation                  | frontend-engineer, product-experience-architect        |
| Playwright CLI execution & capture | devops-ci-engineer                                     |
| Evaluation scoring                 | product-surface-reviewer, product-experience-architect |
| Build                              | devops-ci-engineer, backend-engineer                   |
| Breakthrough planning              | product-experience-architect, frontend-engineer        |

Any delegation map entry that assigns a category to an undefined or unlisted role MUST produce a violation finding naming the undefined role and the category.

## Required Process

### Step 0 — Execution Plan

Before any code is written, create an execution plan record in the work evidence.

Required fields:

- `targetRounds`: ordered array; default funnel is `["r5", "r3", "r2", "r1"]`
- `funnelPolicy`: `5->3->2->1`
- `evaluationAxesSource`: ref to `.qfai/contracts/design/evaluation-rubric.yaml`
- `delegationMap`: category-to-role assignments per Delegation Scope Table
- `plannedAt`: ISO-8601 timestamp

### Step 1 — Read Inputs

Read the downstream-ready spec/contract inputs and verify:

- `.qfai/specs/<spec-id>/01_Spec.md`
- `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
- `.qfai/contracts/design/exploration-brief.yaml`
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
4. `.qfai/contracts/design/evaluation-rubric.yaml`
5. `.qfai/contracts/design/evaluator-calibration.yaml`
6. `.qfai/contracts/design/anchor-selection.yaml` (legacy validator alias, when present)
7. `.qfai/contracts/design/evaluation-axes.yaml` (legacy validator alias, when present)
8. `.qfai/contracts/design/selected-direction.yaml`
9. `.qfai/contracts/design/design-system.yaml`
10. `.qfai/contracts/ui/*.yaml`

### Step 2-A — Verify Contract Preconditions

Confirm all of the following before any evaluation:

- classification is UI-bearing
- surface is `web`, `mobile`, `desktop`, or `mixed`
- every declared screen has a stable `screen-id`
- the exploration brief, evaluation rubric, and evaluator calibration contracts satisfy the required schema

### Step 2-B — Verify Environment Preconditions

Confirm all of the following before launching the first required delegation:

- Run `qfai prototyping preflight --target-url <url>` when a concrete target URL is known, or `qfai doctor --profile prototyping` to diagnose the same runtime assumptions from config.
- Every active agent-wrapper integration under `.claude/agents/` and `.github/agents/` contains valid wrappers for `frontend-engineer`, `product-experience-architect`, `product-surface-reviewer`, `backend-engineer`, and `devops-ci-engineer`, and each wrapper resolves to a canonical role card with valid frontmatter.
- The canonical role cards' literal required-input paths exist after init; do not proceed with dead references in shipped assets.
- `qfai doctor --profile prototyping` resolves a runnable Playwright CLI launcher (project wrapper, `node_modules/.bin`, PATH, or `npx --no-install playwright-cli`) and verifies it with a bounded invocation probe.
- `targetUrl` responds with HTTP 200-399 before capture starts. If it does not, start or repair the dev server first; do not pretend the evaluator can proceed.
- Preflight diagnoses readiness only; it does NOT guarantee sub-agent success. If the first required delegation fails, stop the stage and report remediation. Environment repair is part of preflight, not a reviewer-side waiver.

### Step 3 — Generate Divergent Directions

Generate 5 clearly distinct design directions before selecting a winner.
Do not begin with a single incumbent direction.

### Step 4 — Round Start: Prepare Candidate Review Bundle & Command Plans

Before launching the evaluator, prepare the round-scoped artifacts via QFAI (not by hand):

- Run `qfai prototyping round-start --round <rN> --candidates <csv> --target-url <url> --mode <mode>`.
- QFAI produces:
  - `.qfai/evidence/prototyping/rounds/<rN>/command-plans.json` — the candidate-aware Playwright CLI command plans
  - `.qfai/evidence/prototyping/rounds/<rN>/review-bundle.json` — the evaluator input bundle (candidates, axisDefs, designSystemChecklist, commandPlanRef)
- Do not invent evidence paths. Paths are fixed by QFAI per the resolved primary prototyping spec.

### Step 5 — Capture Role Executes the Command Plans and Captures Evidence

For every declared screen of every active candidate in the current round, the capture role (`devops-ci-engineer`):

1. Reads `command-plans.json` for the round
2. Resolves the launcher from the preflight/doctor result and applies it to each logical `toolId + args` command entry
3. Writes stdout to `stdoutPath` when the plan marks an output as stdout-backed (for example HTML capture)
4. Performs interaction commands (click/fill) to exercise `primaryTasks` noted in the plan
5. Saves the executed command transcript to `<candidate-path>/<screen-id>.commands.json`

If any capture step fails, the capture role records the failure and stops pretending the screen was evaluated. The round is incomplete and must be rerun.

### Step 6 — Launch Evaluation Reviewers

Launch evaluation reviewer sub-agents with the full context bundle. Inputs are read from `review-bundle.json`:

- per-screen screenshot, HTML, accessibility snapshot, and command log under `rounds/<round>/candidates/<candidate-id>/`
- `axisDefs` (from `.qfai/contracts/design/evaluation-rubric.yaml`)
- `previousScore` from the prior round when available
- `designSystemChecklist` (from `.qfai/contracts/design/design-system.yaml`)
- `commandPlanRef` pointing at `command-plans.json`

`product-surface-reviewer` and `product-experience-architect` own the scoring judgment. The orchestrator owns persistence of the returned scoring payload into `rounds/<round>/evaluator-reviews/<candidate-id>.json` with concrete `evidenceRefs[]` for every score. Placeholder refs are rejected.

### Step 7 — Harvest and Direction Funnel

Run the mandatory convergence funnel:

- `r5`: 5 directions -> top 3
- `r3`: top 3 remixed -> top 2
- `r2`: top 2 -> selected winner `r1`

At the end of each harvestable round:

- run `qfai prototyping round-harvest --round <rN>`
- record survivors with `qfai prototyping round-narrow --round <rN> --survivors <csv>`
- for `r3|r2|r1`, generate absorption templates with `qfai prototyping round-absorb --round <rN> --survivors <csv>`

### Step 8 — Extract Winner Contracts

After the first winner is selected:

- write `.qfai/contracts/design/selected-direction.yaml`
- extract `.qfai/contracts/design/design-system.yaml`

Selecting the first winner is not completion. Do not start completion review and do not use completion wording until Step 9, Step 10, Step 12, reviewer gate, and the perfect-100 score gate pass.

### Step 9 — Polish the Winner

Iterate on the selected winner with normal critique/rework loops.
Do not assume the latest iteration is automatically best; keep best-of-history in evidence.
At least one full post-selection polish loop is mandatory. Each polish loop must include critique, fix, re-capture, re-review, and breakthrough check evidence.

## Cycle Gate

- Completion requires at least one `polish` cycle after winner selection (per the resolved primary prototyping spec). This applies to all modes.
- The same gate applies in every mode; modes differ only in `maxCycles` (low-cost=1, standard=3, full-harness=20).
- If the polish-cycle budget is exhausted before the gate is satisfied, the run does NOT complete. The evaluator returns `REVISE` and the developer may re-run at a higher mode.
- Any phase transition to completion must pass through the cycle gate and the reviewer gate.

### Step 10 — Breakthrough Detection

After each polish iteration, run the mechanical breakthrough detector.
If `allReviewerAxesPerfect100` is false and score improvement is below the configured plateau threshold and code change is below the configured diff threshold, trigger breakthrough branching.

### Step 11 — Breakthrough Branch Loop

When breakthrough is triggered:

- generate exactly 2 branch directions
- compare incumbent + 2 branches
- replace the mainline if a branch wins
- refresh selected-direction/design-system if the winner changes
- record the decision in `.qfai/evidence/breakthrough.json`

### Step 12 — Validate and Verify

- Run `qfai validate --profile prototyping --fail-on error`.
- Route `/qfai-verify` or its equivalent gate workflow for final quality approval.
- Do not declare completion until the reviewer result is `PASS`.

## Evaluator Inputs (Mandatory)

Evaluation reviewer sub-agents MUST be launched with the `review-bundle.json` for the current round. The bundle contains all required inputs. At a minimum, the bundle MUST reference:

1. screenshots (per declared screen, round/candidate path)
2. HTML snapshots (per declared screen, round/candidate path)
3. accessibility snapshots (`<screen-id>.snapshot.txt` per declared screen, round/candidate path)
4. Playwright CLI command log (`<screen-id>.commands.json` per declared screen, round/candidate path)
5. `axisDefs` from `.qfai/contracts/design/evaluation-rubric.yaml`
6. `previousScore` from the prior round when available
7. `designSystemChecklist` from `.qfai/contracts/design/design-system.yaml`
8. `commandPlanRef` pointing at `command-plans.json`

The evaluator writes `evaluator-reviews/<candidate-id>.json` with per-axis `score`, `rationale`, and `evidenceRefs[]`. Every `evidenceRefs[]` entry MUST point to an existing artifact; placeholder strings (`""`, `"tbd"`, `"TBD"`) are rejected by `qfai validate`.

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
- verify `qfai validate --profile prototyping --fail-on error` completed successfully
- verify breakthrough trigger evidence is present
- verify best-of-history handling is documented
- verify at least one post-selection polish iteration completed after winner selection
- verify every reviewer sub-agent scored every evaluation axis at `100/100`
- reject completion claims based on any 95-point threshold
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

Prototyping-specific additions (apply to all modes identically):

- all specs are covered
- all declared screens have 4 artifacts per active candidate / round: screenshot, HTML, accessibility snapshot, Playwright CLI command log
- canonical latest paths mirror the latest accepted winner/polish state
- `review-bundle.json`, `command-plans.json`, and per-candidate evaluator reviews exist for every round
- `selected-direction.yaml` exists
- `design-system.yaml` exists
- `breakthrough.json` exists
- `bestOfHistory` and `breakthrough` sections present in `prototyping.json`
- at least one post-selection polish cycle completed after winner selection
- every reviewer sub-agent scored every evaluation axis at `100/100`
- independent reviewer gate returned `PASS`
- `qfai validate --profile prototyping --fail-on error` passes

## FINAL CHECKLIST (Check Last)

- All specs are covered in the Coverage Matrix.
- Every declared screen has screenshot, HTML, accessibility snapshot, and command log evidence per active candidate / round.
- Canonical latest paths mirror the latest accepted winner/polish artifacts.
- Mode invariant: `maxCycles` is the only mode-dependent field in `prototyping.json` (validated by `QFAI-PROT-MODE-001`).
- Missing evidence triggered rerun instead of waiver.
- Direction funnel `5->3->2->1` completed.
- Direction funnel completion was not treated as stage completion.
- At least one post-selection polish cycle completed with critique/fix/re-capture/re-review/breakthrough checks.
- Every reviewer sub-agent scored every evaluation axis at `100/100`.
- Breakthrough detector ran after polish cycles.
- Independent reviewer returned PASS; otherwise status is REVISE.

## Completion Message & Next Actions (MUST)

Action:

- Proceed: `/qfai-atdd`
- Quality gate: `/qfai-verify`
- Rework prototyping: rerun `/qfai-prototyping` with corrected screenshot/HTML evidence
