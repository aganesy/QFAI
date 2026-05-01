---
name: qfai-prototyping
title: QFAI Prototyping (Single-Thread Design Evolution Loop)
description: "Iterate one prototype through up to 15 cycles of generate-capture-review with explicit pivot permission, until 4 axes reach exceptional or the budget is exhausted."
argument-hint: ""
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [orchestrator, product-experience-architect, product-surface-reviewer, devops-ci-engineer]
routing-profile: ui-surface-aware
mode: execution-focused
---

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

This skill runs one prototype through up to 15 iterations. There is no funnel, no parallel candidates, no mode. Iteration count is fixed at 15.

## Goal

Produce an artifact in which a creative breakthrough has emerged through serial iteration — the kind of self-driven "scrap and reimagine" that arises when the model accumulates enough critique signal that staying on the current path is worse than rebuilding (Anthropic Dutch art museum pattern).

## Required References

- `references/iteration-loop.md`     — flow + evidence paths
- `references/generator-prompt.md`   — generator system prompt + pivot permission
- `references/reviewer-prompt.md`    — reviewer output schema + global anti-slop list
- `references/handoff.md`            — design-system extraction + handoff yaml

## Required Contracts

- `.qfai/specs/spec-*/{01_Spec.md, 03_Acceptance-Criteria.md}`
- `.qfai/contracts/ui/*.yaml`
- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/contracts/design/reference-pool.yaml`
- `.qfai/contracts/design/brand-design.yaml`

`reference-pool.yaml` is read as **deviate-from**, not imitate-this.

## Process

1. **Seed (cycle 0)**
   - Run `qfai prototyping iterate --cycle 0 --target-url <url>`.
   - Generator (product-experience-architect) reads contracts + `references/generator-prompt.md`.
   - Generator writes `.qfai/prototypes/iter-00/index.html` (one self-contained file).
   - Capture + review (steps 2-a / 2-b).
   - Append entry to `prototyping.json#iterations[]`. Commit `prototyping: iter-00`.

2. **Loop (cycle 1..14)**
   - **(a) Capture** (devops-ci-engineer): playwright-cli writes `iter-NN/<screen>.{png,html}`.
   - **(b) Review** (product-surface-reviewer): per `references/reviewer-prompt.md`, write `iter-NN/review.json` with 4-axis ordinal scores, 200–500 word prose critique, `slopPatternsDetected[]`, and `pivotDirective`.
   - **(c) Update** `prototyping.json#iterations[]` and `progress.md`. Commit `prototyping: iter-NN`.
   - **(d) Iterate**: run `qfai prototyping iterate --cycle <n+1>`.
     - exit `0` → continue. Generator reads `pivotDirective` and produces iter-(n+1).
     - exit `64` → all axes exceptional, go to step 3.
     - exit `65` → 15 cycles reached, go to step 3.

3. **Handoff**
   - Mirror latest iter to `.qfai/prototypes/final/index.html`.
   - Per `references/handoff.md`: extract `design-system.yaml`, write `prototype-handoff.yaml`.
   - Run `qfai prototyping certify`.
   - Run `qfai validate --profile prototyping --fail-on error` and `/qfai-verify`.

## Critical Constraints

- DO NOT generate parallel candidates. One lineage only.
- DO NOT preserve elements out of caution; the latest iter is always accepted.
- DO NOT declare DONE before `qfai prototyping certify --check` returns 0.
- DO NOT add `mode/round/polish/branch/concept-fit/design-system-compliance` artifacts.
- DO NOT score similarity to `reference-pool` positively; it is deviate-from input.

## Sub-agent Delegation

| Category    | Allowed Role                  |
| ----------- | ----------------------------- |
| Generation  | product-experience-architect  |
| Capture     | devops-ci-engineer            |
| Review      | product-surface-reviewer      |

## Completion

DONE = `completion-certificate.json` exists AND `qfai prototyping certify --check` returns 0 AND `/qfai-verify` returns PASS.

## Next

- `/qfai-atdd` / `/qfai-implement` / `/qfai-verify`
