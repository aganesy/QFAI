---
name: qfai-prototyping
title: QFAI Prototyping (DESIGN.md-driven UX Loop)
description: "Iterate one prototype through up to 15 cycles of generate-capture-review against a frozen DESIGN.md, focusing on information architecture, navigation flow, usability, and functionality."
argument-hint: ""
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [orchestrator, product-experience-architect, product-surface-reviewer, devops-ci-engineer]
routing-profile: ui-surface-aware
mode: execution-focused
---

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

This skill runs one prototype through up to 15 iterations against a frozen
brand SSOT (`DESIGN.md`). Visual identity is fixed for the whole run; the
loop spends every cycle improving information architecture, navigation
flow, usability, and functionality.

There is no funnel, no parallel candidates, no mode. Iteration count is
fixed at 15. Supported surfaces: `web`, `mobile`, `desktop`, `mixed`.
`cli` and `ui_bearing: false` specs are rejected.

## Goal

Produce one final prototype that satisfies the spec's user need under a
locked brand identity, with all four UX axes at `exceptional`, no layout
anti-patterns, and no DESIGN.md violations.

## Required References

- `references/iteration-loop.md` — flow, exit codes, evidence paths
- `references/generator-prompt.md` — generator system prompt + Tailwind
  CDN + DESIGN.md token injection rules
- `references/reviewer-prompt.md` — reviewer schema, 4 UX axes,
  layout anti-patterns (`lap-001..008`), `designMdViolations`, pivot rules
- `references/handoff.md` — post-loop `design-system.yaml` (DESIGN.md
  token mirror) and `prototype-handoff.yaml`
- `references/design-md-spec.md` — DESIGN.md front-matter schema and
  validation rules
- `templates/DESIGN.md.sample` — reference content shipped at the
  consuming-project root by `qfai init`

## Required Contracts

- `.qfai/specs/spec-*/{01_Spec.md, 03_Acceptance-Criteria.md}`
- `.qfai/contracts/ui/*.yaml`
- root `DESIGN.md`
- `.qfai/contracts/design/DESIGN.md.lock.yaml`

The brand identity is governed by root `DESIGN.md`. The lock yaml records
its sha256 at `/qfai-sdd` Phase 0 freeze. The loop refuses to run if the
current `DESIGN.md` hash does not match the lock.

## Required Process

### Step 2-A — Verify Contract Preconditions

- Confirm the selected spec is UI-bearing and has a supported `surface`.
- Confirm root `DESIGN.md` and `.qfai/contracts/design/DESIGN.md.lock.yaml`
  both exist.
- Confirm `.qfai/contracts/ui/*.yaml` exists.
- Run `qfai prototyping preflight --target-url <url>` (alias for
  `qfai doctor --profile prototyping`). Preflight verifies DESIGN.md
  parses and matches the lock sha256.

### Step 2-B — Verify Environment Preconditions

- Confirm a capture route exists for each declared screen.
- Use `npx --no-install playwright-cli` or
  `node_modules/.bin/playwright-cli` when PATH reachability is uncertain.

### Step 2-C — Run the Loop

1. **Seed (cycle 0)**
   - Run `qfai prototyping iterate --cycle 0 --target-url <url>`.
   - The CLI computes `sha256(DESIGN.md)` and records it in
     `prototyping.json`. The lock sha256 must match.
   - Generator (product-experience-architect) reads contracts +
     `references/generator-prompt.md` + DESIGN.md tokens.
   - Generator writes `.qfai/prototypes/iter-00/index.html` (one
     self-contained file with the inline `tailwind.config` script and
     CDN tags described in `generator-prompt.md`).
   - Capture and review run, producing `iter-00/review.json`.
   - Append entry to `prototyping.json#iterations[]`. Commit
     `prototyping: iter-00`.

2. **Loop (cycle 1..14)**
   - **(a) Capture** (devops-ci-engineer): playwright-cli writes
     `iter-NN/<screen>.{png,html}`.
   - **(b) Review** (product-surface-reviewer): per
     `references/reviewer-prompt.md`, write `iter-NN/review.json` with
     the 4 UX-axis ordinal scores, 200–500 word prose critique,
     `layoutAntiPatternsDetected[]`, `designMdViolations[]`, and
     `pivotDirective`.
   - **(c) Update** `prototyping.json#iterations[]` and `progress.md`.
     Commit `prototyping: iter-NN`.
   - **(d) Iterate**: run `qfai prototyping iterate --cycle <n+1>`.
     - exit `0` → continue. Generator reads `pivotDirective` and
       produces iter-(n+1).
     - exit `64` → all four axes `exceptional` AND
       `layoutAntiPatternsDetected` empty AND `designMdViolations`
       empty. Go to step 3.
     - exit `65` → 15 cycles reached. Go to step 3.
     - exit `2` → input error, including DESIGN.md hash mismatch.
       Stop and ask the user to either restore DESIGN.md or rerun
       `/qfai-sdd` to refreeze.

3. **Handoff**
   - Mirror latest iter to `.qfai/prototypes/final/index.html`.
   - Per `references/handoff.md`: write `design-system.yaml` as a
     deterministic mirror of DESIGN.md tokens (no HTML extraction);
     write `prototype-handoff.yaml`.
   - Run `qfai prototyping certify`.
   - Run `qfai validate --profile prototyping --fail-on error` and
     `/qfai-verify`.

## Evaluator Inputs (Mandatory)

- Screenshot evidence: `.qfai/evidence/prototyping/iter-NN/<screen>.png`
- HTML snapshot: `.qfai/evidence/prototyping/iter-NN/<screen>.html`
- Review inputs: latest screenshot, latest HTML snapshot, prior
  `review.json` files, `progress.md`, root `DESIGN.md` (read-only).

## Critical Constraints

- DO NOT generate parallel candidates. One lineage only.
- DO NOT preserve elements out of caution; the latest iter is always
  accepted.
- DO NOT edit `DESIGN.md` mid-loop. Brand identity is frozen for the
  full run. To change it, edit `DESIGN.md`, refreeze via `/qfai-sdd`,
  and start `/qfai-prototyping` from cycle 0.
- DO NOT introduce hex/rgb/rgba/hsl values, font families, radii, or
  shadows that are not in DESIGN.md. The compliance gate will reject
  the iteration as a `designMdViolations[]` entry and block exit 64.
- DO NOT declare DONE before `qfai prototyping certify --check` returns 0.
- DO NOT add `mode/round/polish/branch/concept-fit` artifacts.

## Delegation Scope Table

| Work                               | Allowed Role                 |
| ---------------------------------- | ---------------------------- |
| Generation                         | product-experience-architect |
| Playwright CLI execution & capture | devops-ci-engineer           |
| Evaluation scoring                 | product-surface-reviewer     |

### Reviewer Gate

- Check Drift Protocol compliance before DONE.
- Check `.qfai/assistant/steering/test-layers.md` alignment.
- Treat reviewer findings as signals, not gates, unless
  certify/validate/verify fails.

## Completion

DONE = `completion-certificate.json` exists AND
`qfai prototyping certify --check` returns 0 AND `/qfai-verify` returns
PASS.

## Next

- `/qfai-atdd` / `/qfai-implement` / `/qfai-verify`
