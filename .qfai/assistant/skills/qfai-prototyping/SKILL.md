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
- Read the canonical sidecar family first: option comparison / `30_option_comparison.md` -> selected anchor screen / `31_selected_anchor_screen.md` -> strategy / `10_implementation_strategy.md` -> taste interview / `11_design_taste_interview.md` -> trend scan / `04_Sources.md` -> 3-layer evaluation family (`20/21/22/23` + optional `24`) -> screen contracts / `40_screen_contracts.md` -> review input bundle / `50_review_input_bundle.md`.

## Goal

Build the minimum runnable vertical slice for **ALL specs** and produce canonical prototyping evidence under `.qfai/evidence/`.

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
- `web`, `mobile`, `desktop`, `mixed` surfaces require runtime gate, render bundle, browser QA bundle, and `fullHarness`.
- `cli` surface requires `fullHarness` but not `uiFidelity`, render evidence, or browser QA.
- `ui_bearing: false` specs are not prototyping execution targets.

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
| cli / full-harness     | required | optional    | n/a                               | n/a                                  | n/a          | **required** |
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
- `cli`: UI-specific evidence remains n/a

## Full-harness minimum completeness

When `mode.effective = full-harness`, record:

- `fullHarness.enabled = true`
- `fullHarness.available`
- `fullHarness.runId`
- `fullHarness.iterationCount >= 1`
- `fullHarness.bestIteration >= 1`
- `fullHarness.terminationReason`
- `fullHarness.reviewerSignoff`
- `fullHarness.scoringTrace`
- `fullHarness.exit`
- `fullHarness.handoff`
- `fullHarness.fakeUiDetection`

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

## Required Process

1. Read `.qfai/specs/spec-*` and determine the surface and requested mode.
2. Build the minimum runnable slice across **ALL specs**.
3. Produce `prototyping.md` and `prototyping.json` with a complete Coverage Matrix.
4. If `web`, `mobile`, `desktop`, or `mixed` surface, capture `uiFidelity`; if full-harness, capture runtime gate, render bundle, and browser QA bundle.
5. Review rendered output, screenshot evidence, HTML snapshots, or preview artifacts against the canonical sidecar family.
6. Record critique findings, classify each as `L1` or `L2`, and either fix or mark the result `REVISE`.
7. Use the read order `option comparison (30_option_comparison.md) -> selected anchor screen (31_selected_anchor_screen.md) -> strategy (10_implementation_strategy.md) -> taste interview (11_design_taste_interview.md) -> trend scan (04_Sources.md) -> 3-layer evaluation family (20/21/22/23 + optional 24) -> screen contracts (40_screen_contracts.md) -> review input bundle (50_review_input_bundle.md)` when the surface is `web`, `mobile`, `desktop`, or `mixed`.
8. Run `qfai validate --fail-on error`.
9. Route reviewer gate and do not declare completion until the result is `PASS`.

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
