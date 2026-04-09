---
name: qfai-prototyping
title: QFAI Prototyping (All-spec runnable skeleton gate)
description: "Implement a minimum runnable skeleton for ALL specs and block DONE until evidence + validate gate pass."
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

<!-- QFAI Skill Body (SSOT) -->

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

This skill is **static-first**. File-based checks and evidence are the default. Runtime-heavy verification is reserved for **explicit full-harness** runs only.

## CRITICAL CONSTRAINTS (Read First)

- Scope is **ALL specs** from `.qfai/specs/spec-*`.
- Evidence is mandatory in **markdown + json** under `.qfai/evidence/`.
- `DONE is forbidden` until prototyping evidence, reviewer gate, and `qfai validate --fail-on error` pass.
- `qfai prototyping run` is available as an auxiliary generate-side command, not the primary surface for this skill.
- Defaulting to full-harness is prohibited.
- If a required API endpoint still returns `404`, the run is incomplete.
- `L1` and `L2` critique findings must be reflected in the evidence pack or justified as `REVISE`.
- `uiFidelity` is the canonical UI evidence block for UI-bearing surfaces.
- `ui_bearing: false` specs are not prototyping execution targets. UI-only placeholders are not required for such specs.
- Review rendered output, screenshot evidence, HTML snapshots, or preview artifacts before closing any UI-affecting run.
- Read the canonical sidecar family first: option comparison / `30_option_comparison.md` -> selected anchor screen / `31_selected_anchor_screen.md` ->
  strategy / `10_implementation_strategy.md` -> taste interview / `11_design_taste_interview.md` ->
  trend scan / `04_Sources.md` -> 3-layer evaluation family (`20/21/22/23` + optional `24`) ->
  screen contracts / `40_screen_contracts.md` -> review input bundle / `50_review_input_bundle.md`.

## Goal

Build the minimum runnable vertical slice for **ALL specs** and produce canonical prototyping evidence under `.qfai/evidence/`.

### Mode-specific Goals

| Mode         | Goal                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| low-cost     | Static structure proof. Skeleton + evidence files only.                                                                                                                         |
| standard     | Customer-presentable vertical slice. UI fidelity + static evidence.                                                                                                             |
| full-harness | **Iterative design-improvement loop.** Evaluate → Identify → Fix → Re-evaluate until convergence, plateau, or max-iterations. Each iteration produces measurable quality delta. |

## Non-goals

- Acceptance test automation (`/qfai-atdd`)
- Contract redesign
- Public CLI surface expansion

## Mode Selection Protocol

Mode selection precedence:

1. explicit request (`mode=low-cost|standard|full-harness`)
2. discussion recommendation from `prototyping.yaml`
3. default `standard`

Record in `prototyping.json`:

- `mode.requested` (optional)
- `mode.effective` (required)
- `mode.source` (required)
- `mode.rationale` (required)
- `mode.discussionRecommendation` (optional)

## Surface Semantics

Canonical prototyping surfaces are: `web`, `mobile`, `desktop`, `cli`, `mixed`.

- `ui_bearing: false` specs are **not** prototyping execution targets. Prototyping execution is only invoked for `ui_bearing: true` or `mixed` classifications.
- For `cli` surface: render screenshot evidence is not required; browser QA is not required. Only output / interaction / structured evidence is expected.
- For `web`, `mobile`, `desktop` surfaces: route/contract fidelity must be captured when `uiFidelity` is required by mode.
- `mixed` surface inherits the union of obligations from the constituent surfaces.

## Prototyping Modes

### Low-cost

- Static checks only.
- Suitable for early skeleton work.
- `web`, `mobile`, `desktop`, `mixed` surfaces may include `uiFidelity` and render/browser artifacts, but they are optional.
- `cli` surface does not require `uiFidelity`, render evidence, or browser QA.
- `skeleton` mode is allowed for lightweight UI proof.

### Standard

- Static checks plus optional light validation.
- This is the default mode.
- `web`, `mobile`, `desktop`, `mixed` surfaces require `uiFidelity`.
- `cli` surface does not require `uiFidelity`, render evidence, or browser QA.
- Runtime gate, render bundle, and browser QA bundle are optional.

### Full-harness

- Explicit opt-in only. Never auto-activate.
- Adds runtime-heavy obligations and full-harness audit metadata.
- Full-harness is allowed only for UI-bearing surfaces that require visual/browser evidence.
- `web`, `mobile`, `desktop`, `mixed` surfaces require runtime gate, render bundle, browser QA bundle, and `fullHarness`.
- `cli` surface must not use `full-harness`; use `low-cost` or `standard`.
- `ui_bearing: false` specs are not prototyping execution targets.
- Full-harness is a **measurement-driven iterative workflow**: each `qfai prototyping run --mode full-harness` invocation records exactly one iteration of real code observation. Multiple iterations are formed by running the command multiple times with real code changes in between.
- The discussion 3-layer evaluation score measures **design direction quality** and MUST NOT be copied into `fullHarness.scoringTrace`.
  Prototyping scores measure **implementation fidelity** against the selected anchor.
- `--reviewer <id>` is mandatory for full-harness. Placeholder values are rejected.
- `--change-summary` and `--limitation` capture per-iteration context.
- Calibration parameters from `qfai.config.yaml > prototyping.calibration` are the sole runtime parameter source.
- **Current version**: Full-harness is strictly evidence-driven:
  - Calibration pack is mandatory — missing pack/version/thresholds is a fatal error (no fallback defaults).
  - `2 iteration` minimum for `converged` — single-iteration accept does NOT produce `converged`.
  - Trend / discussion / screen contract evidence are mandatory for L2 scoring — empty evidenceRefs is an error.
  - UI fidelity uses **screen-level** observation — aggregate/flat summary is prohibited.
  - Pre-scored `l1`/`l2` metadata flow-through is prohibited — panels must be computed from real `panelInputs`.
  - Per-spec zero-fill fallback is prohibited — all specs must have real coverage data.
  - DB object declarations without observation evidence are rejected.
  - `mockPaths` is a negative-only issue ledger (`fail|finding`) — `status="pass"` is prohibited.
  - Hardcoded default `packVersion` is rejected by the validator.

## Obligation Matrix

### surface / mode

| surface / mode         | specs    | runtimeGate | uiFidelity                        | render evidence                      | browser QA   | fullHarness  |
| ---------------------- | -------- | ----------- | --------------------------------- | ------------------------------------ | ------------ | ------------ |
| web / low-cost         | required | optional    | optional (`skeleton` allowed)     | optional (`captured/skipped/failed`) | optional     | absent       |
| web / standard         | required | optional    | **required** (`interactive` only) | optional (`captured/skipped/failed`) | optional     | absent       |
| web / full-harness     | required | required    | **required** (`interactive` only) | **required**                         | **required** | **required** |
| mobile / low-cost      | required | optional    | optional (`skeleton` allowed)     | optional (`captured/skipped/failed`) | optional     | absent       |
| mobile / standard      | required | optional    | **required** (`interactive` only) | optional (`captured/skipped/failed`) | optional     | absent       |
| mobile / full-harness  | required | required    | **required** (`interactive` only) | **required**                         | **required** | **required** |
| desktop / low-cost     | required | optional    | optional (`skeleton` allowed)     | optional (`captured/skipped/failed`) | optional     | absent       |
| desktop / standard     | required | optional    | **required** (`interactive` only) | optional (`captured/skipped/failed`) | optional     | absent       |
| desktop / full-harness | required | required    | **required** (`interactive` only) | **required**                         | **required** | **required** |
| cli / low-cost         | required | optional    | n/a                               | n/a                                  | n/a          | absent       |
| cli / standard         | required | optional    | n/a                               | n/a                                  | n/a          | absent       |
| mixed / low-cost       | required | optional    | optional (`skeleton` allowed)     | optional (`captured/skipped/failed`) | optional     | absent       |
| mixed / standard       | required | optional    | **required** (`interactive` only) | optional (`captured/skipped/failed`) | optional     | absent       |
| mixed / full-harness   | required | required    | **required** (`interactive` only) | **required**                         | **required** | **required** |

`uiFidelity.mode` policy:

- `low-cost`: `skeleton` or `interactive`
- `standard`: `interactive` only — `skeleton` is rejected by the validator
- `full-harness`: `interactive` only — `skeleton` is rejected; render evidence, Browser QA, runtimeGate, and fullHarness block are all required
- `cli`: `uiFidelity` is not emitted; render and browser QA are not required

Interpretation:

- `required`: validator enforces presence and completeness
- `optional`: if present, schema must be valid; if absent, no issue
- `n/a`: absent is normal success

## Required Evidence

### Evidence (MANDATORY)

- `.qfai/evidence/prototyping.md`
- `.qfai/evidence/prototyping.json`
- `.qfai/evidence/render.json` when render evidence is emitted or required by mode
- `.qfai/evidence/browser-qa.json` when browser QA evidence is emitted or required by mode
- `.qfai/evidence/browserQa.summary.json` when browser QA evidence is emitted or required by mode
- `.qfai/evidence/browserQa.findings.json` when browser QA evidence is emitted or required by mode
- `.qfai/evidence/browserQa.repairs.json` when browser QA evidence is emitted or required by mode
- `.qfai/evidence/fullHarness.exit.json` when `mode.effective = full-harness`
- `.qfai/evidence/fullHarness.handoff.json` when `mode.effective = full-harness`
- `.qfai/evidence/fullHarness.fakeUiDetection.json` when `mode.effective = full-harness`
- `Coverage Matrix` covering all specs
- critique summary with `L1` / `L2` findings and disposition

### low-cost obligations

- always: `specs[]`, `meta.generatedAt`, `meta.toolVersion`, `meta.commands[]`, `mode.*`
- `web`, `mobile`, `desktop`, `mixed`: `uiFidelity` optional, render/browser optional
- `cli`: UI-specific evidence is n/a

### standard obligations

- always: `specs[]`, `meta.*`, `mode.*`
- `web`, `mobile`, `desktop`, `mixed`: `uiFidelity` required
- `cli`: UI-specific evidence is n/a
- runtime gate and browser QA remain optional

### full-harness obligations

- always: `specs[]`, `meta.*`, `mode.*`, `fullHarness`
- `web`, `mobile`, `desktop`, `mixed`: `runtimeGate`, `.qfai/evidence/render.json`, Browser QA bundle trio, `uiFidelity`
- `cli`: `full-harness` is invalid. UI-specific evidence remains n/a in `low-cost` / `standard`.

## Full-harness minimum completeness

When `mode.effective = full-harness`, record:

- `fullHarness.enabled = true`
- `fullHarness.runId`
- `fullHarness.calibrationRef` (configPath, packPath, packVersion)
- `fullHarness.iterationCount >= 1` (validator errors if `== 1` with `terminationReason: converged` — convergence requires 2+ iterations)
- `fullHarness.status` (`in-progress` or `completed`)
- `fullHarness.terminationReason` (required when `status = completed`)
- `fullHarness.reviewerSignoff` (reviewerId, status, timestamp, source)
- `fullHarness.reviewerLogs` (per-iteration reviewer verdicts)
- `fullHarness.iterations` (full iteration records with commitSha, L1/L2 panel scores, limitations)
- `fullHarness.scoringTrace` entries MUST equal `iterationCount` (validator errors on mismatch)
- `fullHarness.scoringTrace` SHOULD show measurable progression (non-monotonic traces are flagged as info)
- `fullHarness.limitations` (unresolved limitations)
- `fullHarness.bestIteration >= 1`
- `fullHarness.exit`
- `fullHarness.handoff`
- `fullHarness.fakeUiDetection`
- `weightedTotal = min(L1.total, L2.total)` — validator enforces this invariant

## Canonical Bundles

- render bundle: `.qfai/evidence/render.json`
- browser QA bundle: `.qfai/evidence/browser-qa.json`
- browser QA summary: `.qfai/evidence/browserQa.summary.json`
- browser QA findings: `.qfai/evidence/browserQa.findings.json`
- browser QA repairs: `.qfai/evidence/browserQa.repairs.json`
- full-harness exit: `.qfai/evidence/fullHarness.exit.json`
- full-harness handoff: `.qfai/evidence/fullHarness.handoff.json`
- full-harness fake-UI detection: `.qfai/evidence/fullHarness.fakeUiDetection.json`

Render bundle uses `captured | skipped | failed`.
Browser QA bundle uses `completed | skipped | failed`.

## Full-Harness Iteration Protocol

Full-harness mode is a **measurement-driven iterative workflow**. Each CLI invocation measures the current code state; it does NOT modify code.

### Iteration Cycle Definition

Each iteration consists of exactly 1 measurement:

1. **Measure**: `qfai prototyping run --mode full-harness --reviewer <id> --change-summary "what changed"` observes the current code state, captures render/browserQA/runtimeGate/uiFidelity/specCoverage evidence, and computes L1/L2 panel scores.

Multiple iterations are formed by **real code changes between runs**:

- Run 1: measure initial state
- Developer/AI fixes code based on findings
- Run 2: measure improved state (delta computed automatically)
- Repeat until converged, plateau, or max-iterations

The runtime does NOT contain a self-modifying loop. It does NOT generate code, plan improvements, or fabricate iteration results.

### Calibration Configuration Reference

The iteration loop MUST read calibration parameters from `qfai.config.yaml`:

```yaml
prototyping:
  calibration:
    packPath: ".qfai/evidence/calibration.yaml" # evaluation criteria source
    thresholds:
      accept: 0.8 # weighted total >= accept → converged
      refine: 0.5 # weighted total >= refine → continue improving
    maxIterations: 15 # hard ceiling on iteration count
    plateauDelta: 0.02 # delta < this for N consecutive iterations → plateau
    plateauLookback: 3 # N for plateau detection window
```

Runtime calibration is sourced from `qfai.config.yaml > prototyping.calibration`. There are no hardcoded MIN_ITERATIONS/MAX_ITERATIONS constants — `maxIterations` is configurable.

### Termination Conditions

The loop terminates when **any** of these conditions is met:

| Condition              | `terminationReason` | Description                                                                          |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Accept threshold met   | `converged`         | `weightedTotal >= thresholds.accept` AND `iterationCount >= 2` (plateau check based) |
| Max iterations reached | `max-iterations`    | `iterationCount >= maxIterations`                                                    |
| Score plateau detected | `plateau`           | Score delta < `plateauDelta` for `plateauLookback` consecutive iterations            |
| User manual stop       | `manual-stop`       | User explicitly requests termination                                                 |

**IMPORTANT**: `converged` with `iterationCount < 2` is a contradiction and will trigger validator errors (QFAI-PROT-290, QFAI-PROT-308). Single-iteration accept does NOT produce `converged` — convergence requires `iterationCount >= 2` AND plateau-based determination.

### Independent Evaluator Panel (MUST)

To prevent self-evaluation bias, the evaluator MUST be independent from the generator:

| Layer                  | Agent                          | Input Scope                                                 | Role                                                    |
| ---------------------- | ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------- |
| L1: Design Quality     | `product-surface-reviewer`     | Screenshot/HTML snapshot + evaluation axis definitions ONLY | UI/UX/visual coherence scoring                          |
| L2: Product Experience | `product-experience-architect` | Same as L1 + screen contracts + selected anchor             | User journey / IA / transition coherence                |
| L3: Process Audit      | `qa-gatekeeper`                | `fullHarness` evidence block ONLY                           | iterationCount/scoringTrace/terminationReason integrity |

**Operational Rules:**

- L1 and L2 MUST be launched via `task` tool in `background` mode with a separate context. They MUST NOT receive improvement history, previous scores, or generator plans.
- L3 operates on the final evidence file and does not need a separate context.
- The iteration's `weightedTotal` is `min(L1.total, L2.total)`. If either returns below `thresholds.refine`, the iteration decision is `pivot`.
- Fabricated reviewer names (e.g., `"qfai"`, `"default"`, `"placeholder"`) are rejected by the CLI and validator.

### scoringTrace Recording

Each iteration MUST produce a `scoringTrace` entry:

```json
{
  "iteration": 3,
  "l1Total": 0.75,
  "l2Total": 0.68,
  "weightedTotal": 0.68,
  "deltaFromPrevious": 0.05,
  "decision": "refine",
  "commitSha": "abc123def"
}
```

`weightedTotal` is always `min(l1Total, l2Total)`. The validator enforces this invariant.

**Score Scope Separation:**

- Discussion 3-layer scores evaluate **design direction quality** (option comparison).
- Prototyping scoringTrace evaluates **implementation fidelity** against the selected anchor.
- These are different evaluation targets. Copying discussion scores into `scoringTrace` is prohibited.

### Maximum Delta Cap

Per-axis score improvement per iteration is capped at `maxDeltaPerAxisPerIteration: 0.15`.
Any reported delta exceeding this cap MUST trigger re-evaluation or justification.
This prevents single-iteration score inflation.

## Evaluation Rigor Rules (Full-Harness)

### Rubric-Based Scoring Structure

Each evaluation axis MUST use a 3-tier rubric:

| Tier                  | Criteria                                 | Score Range |
| --------------------- | ---------------------------------------- | ----------- |
| `existence_gate`      | Is the element present at all?           | 0.0-0.3     |
| `quality_criteria`    | Does it meet baseline quality standards? | 0.3-0.7     |
| `excellence_criteria` | Does it exceed expectations?             | 0.7-1.0     |

An axis that fails `existence_gate` cannot score above 0.3 regardless of other qualities.

### L1/L2 Classification and Agent-Fixable Assessment

| Level     | Definition                                                                          | Agent-fixable?                      | Action                                |
| --------- | ----------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| L1        | Structural deficiency (missing element, broken navigation, accessibility violation) | Yes — must fix in current iteration | Fix immediately                       |
| L2        | Quality shortfall (suboptimal spacing, weak contrast, inconsistent tone)            | Yes if clearly defined              | Fix or justify deferral with evidence |
| L1-manual | Requires human judgment (brand alignment, business logic correctness)               | No                                  | Record in `limitations` section       |

### Lighthouse Automated Gate (SHOULD)

When the surface is `web` and a dev server is available:

- Run Lighthouse audit (Performance, Accessibility, Best Practices, SEO).
- Record scores in evidence. Scores below 70 in any category are flagged as L1 findings.
- This is SHOULD (not MUST) because dev server availability is not guaranteed.

## Asset Acquisition Strategy (Full-Harness)

When `mode.effective = full-harness`, professional-quality visual assets are REQUIRED (not optional).

### Asset Rules

| Rule                    | Level  | Description                                                                                                                                                                          |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Free asset sources      | MUST   | Use only properly licensed free assets (Unsplash, Pexels, Google Fonts, Heroicons, etc.). Record source URL and license in evidence.                                                 |
| Emoji prohibition       | MUST   | Emoji characters (U+1F000–U+1FAFF, U+2600–U+27BF) MUST NOT appear in UI output as decorative elements. Unicode symbols for functional purposes (e.g., ✓ for checkmarks) are allowed. |
| Placeholder prohibition | MUST   | "Lorem ipsum", `placeholder.com` images, and gray boxes are not acceptable in full-harness final output.                                                                             |
| Attribution             | SHOULD | Record asset attributions in `prototyping.md` or a dedicated `assets.md`.                                                                                                            |

### Accessibility Checklist (Full-Harness MUST)

- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG 2.1 AA)
- All interactive elements are keyboard-navigable
- Images have `alt` attributes (decorative images use `alt=""`)
- Form inputs have associated labels
- Focus indicators are visible

### Trust Signal Checklist (Full-Harness SHOULD)

- Consistent typography hierarchy (h1 > h2 > h3 > body)
- Consistent spacing rhythm (4px/8px grid or equivalent)
- Professional color palette (not random/clashing colors)
- Loading states and error states are designed (not browser defaults)
- No broken images or missing resources in rendered output

### Dev Server Management Protocol

When a dev server is started for evidence collection:

1. Record the process PID and port in evidence metadata.
2. After evidence collection, terminate the dev server explicitly.
3. Do not leave orphaned dev server processes running.

## Required Process

1. Read `.qfai/specs/spec-*` and determine the surface and requested mode.
2. Build the minimum runnable slice across **ALL specs**.
3. Produce `prototyping.md` and `prototyping.json` with a complete Coverage Matrix.
4. If `web`, `mobile`, `desktop`, or `mixed` surface, capture `uiFidelity`; if full-harness, capture runtime gate, render bundle, and browser QA bundle.
5. Review rendered output, screenshot evidence, HTML snapshots, or preview artifacts against the canonical sidecar family.
6. **[full-harness only]** Execute the Full-Harness Iteration Protocol:
   a. Initialize calibration from `qfai.config.yaml > prototyping.calibration`.
   b. Run Evaluate → Identify → Fix → Re-evaluate cycle.
   c. Launch independent evaluators (product-surface-reviewer, product-experience-architect) per iteration.
   d. Record each iteration in `scoringTrace`.
   e. Continue until termination condition is met.
   f. Record `terminationReason`, `iterationCount`, `bestIteration`.
7. Record critique findings, classify each as `L1` or `L2`, and either fix or mark the result `REVISE`.
8. Use the following read order when the surface is `web`, `mobile`, `desktop`, or `mixed`:
   option comparison (`30_option_comparison.md`) -> selected anchor screen (`31_selected_anchor_screen.md`) ->
   strategy (`10_implementation_strategy.md`) -> taste interview (`11_design_taste_interview.md`) ->
   trend scan (`04_Sources.md`) -> 3-layer evaluation family (`20/21/22/23` + optional `24`) ->
   screen contracts (`40_screen_contracts.md`) -> review input bundle (`50_review_input_bundle.md`).
9. Run `qfai validate --fail-on error`.
10. Route reviewer gate and do not declare completion until the result is `PASS`.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results.
- Orchestrator MUST NOT self-approve.
- Orchestrator MUST keep evidence paths canonical and ensure outputs stay under `.qfai/evidence/`.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Simulation mode allowed only when user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | `role`           | `task`     | `refs`       | `refs`        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer checks Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals.
- Reviewer must verify evidence obligations for the chosen `surface / mode`.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.
- **[full-harness only]** Reviewer MUST verify:
  - `iterationCount >= 2` for converged status (single-iteration converged is prohibited).
  - `scoringTrace` contains entries equal to `iterationCount`.
  - `reviewerLogs` count equals `iterationCount` (one log per iteration, QFAI-PROT-304).
  - `scoringTrace` shows measurable score progression (not all identical scores).
  - `terminationReason` is consistent with the scoring trajectory.
  - Independent evaluators were actually invoked (not fabricated names or placeholders).
  - `specCoverage` is measured from real spec artifacts, not zero-seeded (QFAI-PROT-305).
  - `mockPaths` derived from browser QA findings only, no synthetic auto-pass (QFAI-PROT-306).
  - `calibrationRef.packVersion` resolved from pack metadata, not hardcoded (QFAI-PROT-307).
  - `limitations` section is present and documents known shortcomings honestly.

### Limitations Section (Full-Harness MUST)

When `mode.effective = full-harness`, the evidence MUST include a `## Limitations` section in `prototyping.md` that documents:

- Known quality shortcomings that were not resolved by the iteration loop.
- Evaluation axes where scores did not reach `accept` threshold.
- Areas where agent judgment is insufficient (requires human review).
- Technical constraints that prevented further improvement (e.g., asset licensing, browser API limitations).

Omitting limitations or recording an empty limitations section when `iterationCount < maxIterations` is a process integrity concern.

## Completion Contract (Shared)

Before DONE:

- package assets and generated evidence must match the obligation matrix
- `qfai validate --fail-on error` must pass
- reviewer gate must return PASS
- `web`, `mobile`, `desktop`, `mixed` surface runs must reconcile `uiFidelity`, render evidence, and critique outputs
- `cli` surface runs preserve n/a semantics for render and browser QA without fake placeholders
- `ui_bearing: false` specs are not prototyping execution targets

## FINAL CHECKLIST (Check Last)

### Completion Checklist (MUST)

- All specs are covered in the Coverage Matrix.
- `prototyping.md` and `prototyping.json` are both updated.
- Required mode/surface evidence is present.
- `404` findings are resolved or the run is not complete.
- `L1` / `L2` critique findings are documented and dispositioned.
- `uiFidelity` is present when required.
- Reviewer returned `PASS`; otherwise status is `REVISE`.

## Completion Message & Next Actions (MUST)

Action:

- Proceed: `/qfai-atdd`
- Quality gate: `/qfai-verify`
- Rework prototyping: rerun `/qfai-prototyping` with corrected evidence
