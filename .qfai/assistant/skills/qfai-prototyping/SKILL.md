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

This skill is static-first and file-based by default: it runs one prototype
through up to 15 iterations against a frozen brand SSOT (`DESIGN.md`), with
no parallel candidates, no mode, and a fixed 15-cycle budget. Visual identity
is fixed for the whole run; every cycle improves information architecture,
navigation flow, usability, and functionality. Supported UI prototyping
surfaces are: web, mobile, desktop, mixed. cli is not a prototyping
execution target and is rejected. ui_bearing: false specs are not prototyping
execution targets and are excluded.

## Goal

One final prototype satisfying the spec under a locked brand identity, with all four UX axes `exceptional`, no layout anti-patterns, and no DESIGN.md violations.

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
  both exist; confirm `.qfai/contracts/ui/*.yaml` exists.
- Run `qfai prototyping preflight --target-url <url>` (alias for
  `qfai doctor --profile prototyping`) — verifies DESIGN.md parses and
  matches the lock sha256.

### Step 2-B — Verify Environment Preconditions

- Confirm a capture route exists for each declared screen.
- Use `npx --no-install playwright-cli` or
  `node_modules/.bin/playwright-cli` when PATH reachability is uncertain.

### Step 2-C — Run the Loop

| Step   | Actor                                                     | Action                                                                                                                                                                                                                                                                                                                                                                                                              | Output                                   |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| C0     | product-experience-architect                              | `qfai prototyping iterate --cycle 0 --target-url <url>`. CLI computes `sha256(DESIGN.md)`; lock match enforced. Generator reads contracts + `references/generator-prompt.md` + DESIGN.md tokens and writes `.qfai/prototypes/iter-00/index.html`. Capture + review → `iter-00/review.json`. Append entry; commit `prototyping: iter-00`.                                                                            | iter-00, prototyping.json#designMdSha256 |
| C1..14 | (a) devops, (b) reviewer, (c) orchestrator, (d) generator | (a) playwright-cli writes `iter-NN/<screen>.{png,html}`; (b) reviewer writes `iter-NN/review.json` per `references/reviewer-prompt.md` (4 UX axes ordinal, 200..500 word critique, `layoutAntiPatternsDetected[]`, `designMdViolations[]`, `pivotDirective`); (c) update `prototyping.json#iterations[]` + `progress.md`, commit `prototyping: iter-NN`; (d) `qfai prototyping iterate --cycle <n+1>` decides exit. | iter-NN, exit ∈ {0, 64, 65, 2}           |
| H      | orchestrator                                              | Mirror latest to `.qfai/prototypes/final/index.html`. Per `references/handoff.md`: write `design-system.yaml` (deterministic DESIGN.md token mirror, no HTML extraction) + `prototype-handoff.yaml`. Run `qfai prototyping certify`, then `qfai validate --profile prototyping --fail-on error`, then `/qfai-verify`.                                                                                               | DONE                                     |

**Exit codes**: `0` continue (read `pivotDirective`); `64` convergence (4
axes `exceptional` AND `layoutAntiPatternsDetected` empty AND
`designMdViolations` empty); `65` 15 cycles reached; `2` input error
(incl. DESIGN.md hash mismatch — restore DESIGN.md or rerun `/qfai-sdd`
to refreeze).

## Evaluator Inputs (Mandatory)

- Screenshot evidence path: `.qfai/evidence/prototyping/iter-NN/<screen>.png`
- HTML snapshot path: `.qfai/evidence/prototyping/iter-NN/<screen>.html`
- Review inputs: latest screenshot, latest HTML snapshot, prior
  `review.json` files, `progress.md`, root `DESIGN.md` (read-only),
  `axisDefs`, `previousScore`, `designSystemChecklist`.

## Critical Constraints

- One lineage only — no parallel candidates, no best-of-history; the
  latest iter is always accepted.
- `DESIGN.md` is frozen for the run; to change it, edit + rerun
  `/qfai-sdd` to refreeze + start cycle 0.
- Token-only colors / fonts / radii / shadows — non-DESIGN.md hex / rgb /
  rgba / hsl / font / radius / shadow values are recorded in
  `designMdViolations[]` and block exit 64.
- DONE only when `qfai prototyping certify --check` returns 0.
- No `mode / round / polish / branch / concept-fit` artifacts.

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

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Next

- `/qfai-atdd` / `/qfai-implement` / `/qfai-verify`
