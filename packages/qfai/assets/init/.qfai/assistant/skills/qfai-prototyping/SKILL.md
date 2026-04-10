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

## Required process

1. Read the latest discussion pack and verify `prototyping.yaml`, `04_Sources.md`, `20/21/22/23`, and `40_screen_contracts.md`.
   Read order: option comparison / `30_option_comparison.md` -> selected anchor screen / `31_selected_anchor_screen.md` -> strategy / `10_implementation_strategy.md` -> taste interview / `11_design_taste_interview.md` -> trend scan / `04_Sources.md` -> 3-layer evaluation family (`20/21/22/23`) -> screen contracts / `40_screen_contracts.md`.
2. Verify the classification is UI-bearing and the surface is `web`, `mobile`, `desktop`, or `mixed`.
3. Implement the minimum runnable slice for all specs.
4. Run `qfai prototyping run --mode full-harness --reviewer <id>`.
5. Review render evidence, HTML snapshots, Browser QA, runtimeGate, uiFidelity, and specCoverage for every declared screen.
6. Fix findings and rerun until the evidence is coherent.
7. Run `qfai validate --fail-on error`.
8. Route an independent reviewer and do not declare completion until the result is `PASS`.

## Reviewer gate

### Reviewer Gate (MUST)

- Reviewer must verify full-harness evidence completeness.
- Reviewer must verify calibration pack usage via `calibrationRef`.
- Reviewer must reject self-reference, synthetic refs, and `mockPaths.status="pass"`.
- Reviewer must verify `reviewerSignoff`, `reviewerLogs`, `terminationReason`, and `finalDecision` are semantically aligned.
- Reviewer must verify Drift Protocol compliance and alignment with `test-layers.md`.
- Review volume guidance remains signals, not gates.
- Reviewer returns PASS or REVISE only.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator MUST NOT self-approve.
- Orchestrator MUST keep evidence paths canonical and integrate delegated results only.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Simulation mode allowed only when the user explicitly states `Simulation mode allowed`.

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | `role`           | `task`     | `refs`       | `refs`        | PASS/REVISE          |

## Completion Contract (Shared)

- All specs are covered.
- Full-harness evidence is complete and truthful.
- `qfai validate --fail-on error` passes.
- Reviewer returns `PASS`.

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
