---
name: qfai-prototyping
title: QFAI Prototyping (Full-Harness Only)
description: "Build a contract-aligned UI prototype and block completion until full-harness evidence and validate gate pass."
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

This skill is static-first for planning and file review, but the package execution contract is `full-harness` only.
Do not default or downgrade prototyping modes.

## CRITICAL CONSTRAINTS (Read First)

- Scope is all specs from `.qfai/specs/spec-*`.
- Evidence is mandatory in markdown + json under `.qfai/evidence/`.
- DONE is forbidden until prototyping evidence, reviewer gate, and `qfai validate --fail-on error` pass.
- Supported prototyping surfaces are `web`, `mobile`, `desktop`, and `mixed`.
- `cli`, API-only, backend-only, and `ui_bearing: false` classifications are not prototyping execution targets.
- Canonical screen contracts in `discussion-*/uiux/40_screen_contracts.md` are mandatory.
- Browser QA, render evidence, runtimeGate, uiFidelity, specCoverage, and `fullHarness` are mandatory.
- `uiFidelity` is screen-level and must be built from real render/browser evidence.
- `mockPaths` is a negative-only issue ledger with `fail|finding` only.
- Calibration pack is the SSOT. Runtime and validator both resolve from `calibrationRef.packPath`.
- `--reviewer <id>` is mandatory and placeholder reviewer ids are rejected.
- L1 and L2 findings must be fixed or dispositioned before PASS.

## Goal

Build the minimum runnable slice for all specs and produce canonical `full-harness` evidence under `.qfai/evidence/`.

## Mode

### Full-harness

- Full-harness is the package default when prototyping execution is valid.
- Each `qfai prototyping run --mode full-harness --reviewer <id>` invocation records exactly one measured iteration.
- Multiple iterations are formed only by real code changes between runs.
- The runtime does not self-modify code and does not fabricate evidence.

## Obligation matrix

| surface / mode         | specs    | runtimeGate | uiFidelity | render evidence | browser QA | fullHarness |
| ---------------------- | -------- | ----------- | ---------- | --------------- | ---------- | ----------- |
| web / full-harness     | required | required    | required   | required        | required   | required    |
| mobile / full-harness  | required | required    | required   | required        | required   | required    |
| desktop / full-harness | required | required    | required   | required        | required   | required    |
| mixed / full-harness   | required | required    | required   | required        | required   | required    |

## Required evidence

## Evidence (MANDATORY)

- `.qfai/evidence/prototyping.md`
- `.qfai/evidence/prototyping.json`
- `.qfai/evidence/render.json`
- `.qfai/evidence/browser-qa.json`
- `.qfai/evidence/fullHarness.exit.json`
- `.qfai/evidence/fullHarness.handoff.json`
- `.qfai/evidence/fullHarness.fakeUiDetection.json`

## Truthfulness rules

- `mode.effective` must be `full-harness`.
- `runtimeGate` is observed-only. Synthetic status codes are invalid.
- `runtimeGate.evidenceRefs` must contain concrete render/browser QA/spec refs only.
- `specCoverage` must use concrete declared refs and concrete observed refs only.
- Browser QA evidence must be preserved per screen.
- `actionsWired` must reflect actionable control coverage, not finding counts.
- `reviewerSignoff.status` represents final decision, not mere completion.
- `reviewerLogs[].verdict` must align with decision/termination semantics.

## Review semantics

- `accepted` -> `approved`
- `rejected` -> `rejected`
- `abandoned` -> `abandoned`
- Plateau stop or max-iterations stop must not produce `approved`.

## Delegation Scope Table

All sub-agent delegation in this skill MUST follow the category-to-role mapping below.
Assigning a task to a role not listed for the category is a violation and MUST be flagged.

| Category           | Allowed Role(s)                                        |
| ------------------ | ------------------------------------------------------ |
| UI implementation  | frontend-engineer, product-experience-architect        |
| Screenshot capture | devops-ci-engineer                                     |
| Evaluation L1-L2   | product-surface-reviewer, product-experience-architect |
| Build              | devops-ci-engineer, backend-engineer                   |

Any delegation map entry that assigns a category to an undefined or unlisted role (e.g., `"generic-code-writer"`) MUST produce a violation finding naming the undefined role and the category.

## Required process

### Step 0 — Execution Plan (executionPlan)

Before any code is written, create an `executionPlan` record with the following fields:

- `targetIterations`: integer; minimum 2 for full-harness
- `evaluationAxesSource`: reference to the discussion pack evaluation-family files (20/21/22/23)
- `delegationMap`: category-to-role assignments per Delegation Scope Table above
- `plannedAt`: ISO-8601 timestamp

The executionPlan MUST be present in `prototyping.json` when `mode=full-harness`. A validator MUST reject any full-harness record without an executionPlan.

### Iteration Gate

- full-harness convergence requires a minimum of 2 iterations.
- A single-iteration run that reports `converged=true` is invalid; the iteration gate MUST raise an error with message "minimum 2 iterations required before convergence".
- The phase transition from iteration N to N+1 is blocked until `terminationCondition` is met or the gate explicitly authorizes continuation.

### 5-Step Iteration Cycle

Each full-harness iteration follows this fixed sequence:

1. **Capture** — Run `packages/qfai/assets/scripts/capture-screenshots.js --url <url> --out <dir>` and record screenshot paths with timestamps under `scoringTrace[i].screenshotDir`.
2. **Evaluate** — Launch L1 and L2 evaluator sub-agents with full context bundle: (a) screenshots from Step 1, (b) axisDefs from evaluation-family 20/21/22/23, (c) previousScore from prior iteration, (d) designSystemChecklist from `uiux/12_design_system.md`.
3. **Identify** — Aggregate L1 + L2 findings; flag immediate-fix items.
4. **Fix** — Apply fixes per finding disposition; do not close items without evidence.
5. **Re-evaluate** — Re-run Steps 1–4; compare new score to prior score to check plateau.

The sequence MUST NOT be permuted. Parallel execution of Capture+Evaluate is prohibited.

### Evaluator Input — 4 Required Elements

When launching any L1 or L2 evaluator sub-agent, all 4 elements MUST be present in the input:

(a) screenshots — paths produced by capture-screenshots.js for the current iteration
(b) axisDefs — scoring axes from discussion-pack evaluation-family (20/21/22/23)
(c) previousScore — aggregate score from the prior iteration (null for iteration 1)
(d) designSystemChecklist — the compliance checklist derived from `uiux/12_design_system.md`

If any element is missing, a reviewer check MUST raise a finding naming the missing element.
Missing element (d) is a common error when `uiux/12_design_system.md` is absent; the reviewer MUST still flag it.

### Visual Quality Structural Checklist

Each iteration evaluation MUST score all 6 visual categories:

1. Color — color palette adherence to design system tokens
2. Typography — type scale, weight, line-height compliance
3. Spacing — spacing scale and grid alignment
4. Border radius — border-radius consistency across components
5. Shadow — shadow elevation and opacity standards
6. Do's&Don'ts — adherence to explicit do/don't rules from `uiux/12_design_system.md`

### Lighthouse Gate (MUST for web full-harness)

When `surface=web` and `mode=full-harness`, a Lighthouse performance/accessibility report MUST be captured and attached to the evidence. The reviewer gate MUST raise an error "Lighthouse Gate is MUST for full-harness + web surface" when the report is absent.

### Steps (continued)

1. Read the latest discussion pack and verify `prototyping.yaml`, `04_Sources.md`, `20/21/22/23`, and `40_screen_contracts.md`.
   Read order: option comparison / `30_option_comparison.md` -> selected anchor screen / `31_selected_anchor_screen.md` -> strategy / `10_implementation_strategy.md` -> taste interview / `11_design_taste_interview.md` -> trend scan / `04_Sources.md` -> 3-layer evaluation family (`20/21/22/23`) -> screen contracts / `40_screen_contracts.md`.
2. Verify the classification is UI-bearing and the surface is `web`, `mobile`, `desktop`, or `mixed`.
3. Create the executionPlan (Step 0 above).
4. Implement the minimum runnable slice for all specs.
5. Run `qfai prototyping run --mode full-harness --reviewer <id>` — this executes the 5-Step Iteration Cycle per iteration.
6. Review render evidence, HTML snapshots, Browser QA, runtimeGate, uiFidelity, and specCoverage for every declared screen.
7. Fix findings and rerun until the evidence is coherent.
8. Run `qfai validate --fail-on error`.
9. Route an independent reviewer and do not declare completion until the result is `PASS`.

## Reviewer gate

### Reviewer Gate (MUST)

- Reviewer must verify full-harness evidence completeness.
- Reviewer response must include `Result: PASS | REVISE` (matching shared-skill-delegation-baseline.md#reviewer-response-template).
- Reviewer must verify calibration pack usage via `calibrationRef`.
- Reviewer must reject self-reference, synthetic refs, and `mockPaths.status="pass"`.
- Reviewer must verify `reviewerSignoff`, `reviewerLogs`, `terminationReason`, and `finalDecision` are semantically aligned.
- Reviewer must verify Drift Protocol compliance and alignment with `test-layers.md`.
- Review volume guidance remains signals, not gates.
- Reviewer returns PASS or REVISE only.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- Additional prototyping-specific overrides:
- do not self-approve;
- keep evidence paths canonical and integrate delegated results only.

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

- all specs are covered;
- full-harness evidence is complete and truthful;
- `qfai validate --fail-on error` passes;
- reviewer returns `PASS`.

## FINAL CHECKLIST (Check Last)

### Completion Checklist (MUST)

- All specs are covered in the Coverage Matrix.
- Required full-harness evidence is present.
- 404 findings are resolved or the run is not complete.
- uiFidelity is present when required.
- Reviewer returned PASS; otherwise status is REVISE.

## Completion Message & Next Actions (MUST)

Action:

- Proceed: `/qfai-atdd`
- Quality gate: `/qfai-verify`
- Rework prototyping: rerun `/qfai-prototyping` with corrected evidence
