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
routing-profile: ui-bearing
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
- non-ui skip semantics must be preserved. UI-only placeholders are not required when the surface is non-ui.
- Review rendered output, screenshot evidence, HTML snapshots, or preview artifacts before closing any UI-affecting run.
- Read the canonical sidecar family first: option comparison / `30_option_comparison.md` -> selected anchor screen / `31_selected_anchor_screen.md`
  -> strategy / `10_implementation_strategy.md` -> taste interview / `11_design_taste_interview.md` -> trend scan / `04_Sources.md`
  -> 3-layer evaluation family (`20/21/22/23` + optional `24`) -> screen contracts / `40_screen_contracts.md`
  -> review input bundle / `50_review_input_bundle.md`.

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

- `surface: non-ui` means UI-specific evidence is `n/a`.
- For non-ui projects, `uiFidelity`, render evidence, browser QA, and `runtimeGate.ui` may be absent.
- Absent is normal for non-ui. Do not force skipped placeholders unless the project intentionally emits them.
- For UI-bearing projects, route/contract fidelity must be captured when `uiFidelity` is required by mode.

## Prototyping Modes

### Low-cost

- Static checks only.
- Suitable for early skeleton work.
- UI-bearing projects may include `uiFidelity` and render/browser artifacts, but they are optional.
- `skeleton` mode is allowed for lightweight UI proof.

### Standard

- Static checks plus optional light validation.
- This is the default mode.
- UI-bearing projects require `uiFidelity`.
- Runtime gate, render bundle, and browser QA bundle are optional.

### Full-harness

- Explicit opt-in only. Never auto-activate.
- Adds runtime-heavy obligations and full-harness audit metadata.
- UI-bearing projects require runtime gate, render bundle, browser QA bundle, and `fullHarness`.
- Non-ui projects require `fullHarness`, but UI-specific bundles remain n/a.

## Obligation Matrix

### surface / mode

| surface / mode            | specs    | runtimeGate | uiFidelity                        | render evidence                      | browser QA   | fullHarness  |
| ------------------------- | -------- | ----------- | --------------------------------- | ------------------------------------ | ------------ | ------------ |
| non-ui / low-cost         | required | optional    | n/a                               | n/a                                  | n/a          | absent       |
| non-ui / standard         | required | optional    | n/a                               | n/a                                  | n/a          | absent       |
| non-ui / full-harness     | required | optional    | n/a                               | n/a                                  | n/a          | required     |
| ui-bearing / low-cost     | required | optional    | optional (`skeleton` allowed)     | optional (`captured/skipped/failed`) | optional     | absent       |
| ui-bearing / standard     | required | optional    | **required** (`interactive` only) | optional (`captured/skipped/failed`) | optional     | absent       |
| ui-bearing / full-harness | required | required    | **required** (`interactive` only) | **required**                         | **required** | **required** |

`uiFidelity.mode` policy:

- `low-cost`: `skeleton` or `interactive`
- `standard`: `interactive` only — `skeleton` is rejected by the validator
- `full-harness`: `interactive` only — `skeleton` is rejected; render evidence, Browser QA, runtimeGate, and fullHarness block are all required
- `non-ui`: `uiFidelity` is not emitted

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
- `Coverage Matrix` covering all specs
- critique summary with `L1` / `L2` findings and disposition

### low-cost obligations

- always: `specs[]`, `meta.generatedAt`, `meta.toolVersion`, `meta.commands[]`, `mode.*`
- ui-bearing: `uiFidelity` optional, render/browser optional
- non-ui: UI-specific evidence is n/a

### standard obligations

- always: `specs[]`, `meta.*`, `mode.*`
- ui-bearing: `uiFidelity` required
- non-ui: UI-specific evidence is n/a
- runtime gate and browser QA remain optional

### full-harness obligations

- always: `specs[]`, `meta.*`, `mode.*`, `fullHarness`
- ui-bearing: `runtimeGate`, `.qfai/evidence/render.json`, `.qfai/evidence/browser-qa.json`, `uiFidelity`
- non-ui: UI-specific evidence remains n/a

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

## Canonical Bundles

- render bundle: `.qfai/evidence/render.json`
- browser QA bundle: `.qfai/evidence/browser-qa.json`

Render bundle uses `captured | skipped | failed`.
Browser QA bundle uses `completed | skipped | failed`.

## Required Process

1. Read `.qfai/specs/spec-*` and determine the surface and requested mode.
2. Build the minimum runnable slice across **ALL specs**.
3. Produce `prototyping.md` and `prototyping.json` with a complete Coverage Matrix.
4. If UI-bearing, capture `uiFidelity`; if full-harness, capture runtime gate, render bundle, and browser QA bundle.
5. Review rendered output, screenshot evidence, HTML snapshots, or preview artifacts against the canonical sidecar family.
6. Record critique findings, classify each as `L1` or `L2`, and either fix or mark the result `REVISE`.
7. Use the read order
   `option comparison (30_option_comparison.md) -> selected anchor screen (31_selected_anchor_screen.md) -> strategy (10_implementation_strategy.md)`
   `-> taste interview (11_design_taste_interview.md) -> trend scan (04_Sources.md) -> 3-layer evaluation family (20/21/22/23 + optional 24)`
   `-> screen contracts (40_screen_contracts.md) -> review input bundle (50_review_input_bundle.md)` when the project is UI-bearing.
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
- UI-bearing runs must reconcile `uiFidelity`, render evidence, and critique outputs
- non-ui runs must preserve `n/a` semantics without fake placeholders

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
