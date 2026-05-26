---
name: qfai-prototyping
title: QFAI Prototyping (DESIGN.md-driven UX Loop)
description: "Iterate one prototype through up to 10 cycles of generate-capture-review against a frozen DESIGN.md, focusing on information architecture, navigation flow, usability, and functionality."
argument-hint: ""
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [orchestrator, product-experience-architect, product-surface-reviewer, devops-ci-engineer]
routing-profile: ui-surface-aware
mode: execution-focused
---

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

This skill is static-first and file-based by default: it runs every
UI-bearing spec resolved at cycle 0 through up to 10 iterations against
a frozen brand SSOT (`DESIGN.md`) and a frozen spec set, with one
prototype lineage per `spec × screen` pair, no parallel candidates
within a pair, no mode, and a fixed 10-cycle budget. Visual identity
is fixed for the whole run; every cycle improves information
architecture, navigation flow, usability, and functionality. Supported
UI prototyping surfaces are: web, mobile, desktop, mixed. cli is not a
prototyping execution target and is rejected. ui_bearing: false specs
are not prototyping execution targets and are excluded.

## Goal

One final prototype satisfying the spec under a locked brand identity, with all four UX axes `exceptional`, no layout anti-patterns, and no DESIGN.md violations.

## Required References

- `references/iteration-loop.md` — flow, exit codes, evidence paths
- `references/generator-prompt.md` — generator system prompt + Tailwind
  CDN + DESIGN.md token injection rules
- `references/reviewer-prompt.md` — reviewer schema, 4 UX axes,
  layout anti-patterns (`lap-001..006` static regex + `lap-007..008` semantic),
  `designMdViolations`, pivot rules
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

- The skill resolves **every UI-bearing spec in the consumer project in
  one invocation** via `resolveAllUiBearingSpecs()`
  (`core/prototyping/specResolution.ts`) — the strict
  `surface_type: ui-bearing` frontmatter signal plus the matching
  `.qfai/contracts/ui/<spec-id>*.yaml` contract fallback, with the
  legacy `# … prototyping …` title-marker fallback and the
  operator-pinned spec id from the `qfai.config.yaml` `prototyping`
  section folded in by the CLI. Run
  `qfai doctor --profile prototyping` to surface the resolved value.
  Operators authoring CHG-002-shaped projects can rely on the strict
  frontmatter alone; the broader composition covers legacy /
  config-pinned consumers.
  The operator is never prompted to pick a single spec; zero
  UI-bearing specs at cycle 0 is a deterministic no-op exit `0`.
  Confirm each resolved spec has a supported `surface`.
- Confirm root `DESIGN.md` and `.qfai/contracts/design/DESIGN.md.lock.yaml`
  both exist; confirm `.qfai/contracts/ui/*.yaml` exists.
- Run `qfai prototyping preflight --target-url <url>` (alias for
  `qfai doctor --profile prototyping`) — verifies DESIGN.md parses and
  matches the lock sha256.

### Step 2-B — Verify Environment Preconditions

- Confirm a capture route exists for each declared screen.
- Canonical launcher: `npx --no-install playwright` or
  `node_modules/.bin/playwright` when PATH reachability is uncertain.
- Legacy fallback (deprecation window only, sunset at qfai 1.10.0;
  emits `D-DEPRECATED-PROBE`): `npx --no-install playwright-cli` or
  `node_modules/.bin/playwright-cli`.

### Step 2-B.1 — Opt-in iterate flags

Three flags extend `qfai prototyping iterate`; all default OFF so the
prior invocation pattern is byte-equivalent when no flag is passed:

- `--capture` — enable PNG / HTML capture per screen at every cycle.
  Uses the default Playwright runner (dynamic `import("playwright")`;
  Playwright is `optionalDependencies`). Use when you need durable
  pixel / DOM evidence for downstream review, or when the
  `iter-NN/<screen>.review.json` audit needs paired artifacts. Skip
  for fast prose-only cycles.
- `--auto-serve` — start an in-process `node:http` server rooted at
  the prototype tree for the duration of the cycle. SIGINT teardown
  is bounded to 2 s; EADDRINUSE on a foreign owner exits 2 (the
  runner refuses to kill non-iterate processes). Use when no
  external dev server is running. Skip when the orchestrator already
  manages serving (the cycle-0 default).
- `--check-convergence` — read-only peek of
  `.qfai/evidence/prototyping/prototyping.json`. Exits `0` when the
  run converged (`stopReason === "axes-exceptional"` with
  `acceptedIterationIndex` set), exits `2` otherwise. Performs no
  writes, no Playwright launches, no commits. Use at cycle 9
  before committing budget-exhaustion recovery (see "Cycle 9 budget
  exhaustion" below).

### Step 2-C — Run the Loop

| Step  | Actor                                                     | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Output                                   |
| ----- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| C0    | product-experience-architect                              | `qfai prototyping iterate --cycle 0 --target-url <url>`. CLI computes `sha256(DESIGN.md)`; lock match enforced. Generator reads contracts + `references/generator-prompt.md` + DESIGN.md tokens and writes `.qfai/prototypes/iter-00/index.html`. Capture + review → `iter-00/review.json`. Append entry; commit `prototyping: iter-00`.                                                                                                                                                                                                                        | iter-00, prototyping.json#designMdSha256 |
| C1..9 | (a) devops, (b) reviewer, (c) orchestrator, (d) generator | (a) playwright-cli writes `iter-NN/<screen>.{png,html}`; (b) reviewer writes `iter-NN/review.json` per `references/reviewer-prompt.md` (4 UX axes ordinal, 200..500 word critique, `layoutAntiPatternsDetected[]`, `designMdViolations[]`, `pivotDirective`); (c) update `prototyping.json#iterations[]` + `progress.md`, commit `prototyping: iter-NN`; (d) `qfai prototyping iterate --cycle <n+1>` decides exit. After C9 do NOT call `--cycle 10` — the CLI rejects out-of-range cycles. See the "Cycle 9 budget exhaustion" subsection below for recovery. | iter-NN, exit ∈ {0, 64, 65, 66, 2}       |
| H     | orchestrator                                              | Mirror latest to `.qfai/prototypes/final/index.html`. Per `references/handoff.md`: write `design-system.yaml` (deterministic DESIGN.md token mirror, no HTML extraction) + `prototype-handoff.yaml`. Run `qfai validate --profile prototyping --fail-on error` (produces `validate.json` with `counts.error === 0`), then `/qfai-verify` (produces `verify.json` with `status === "PASS"`), then `qfai prototyping certify` — certify requires both gate files to be present and passing before it will seal the certificate.                                   | DONE                                     |

**Exit codes**: `0` continue (read `pivotDirective`); `64` convergence (4
axes `exceptional` AND `layoutAntiPatternsDetected` empty AND
`designMdViolations` empty); `65` 10 cycles reached; `66` license-verify
failure (`imageSources[]` resolved to a non-allowlisted source, unknown
license tier, non-HTTPS URL, host mismatch vs the cycle-0 frozen
`sourceHosts`, or missing / empty `attribution` — see "License-verify
hard-stop (exit 66)" below for recovery); `2` input error or lock drift
(incl. DESIGN.md hash mismatch — re-run prototyping from cycle 0 after
editing `DESIGN.md` and refreezing the lock via `/qfai-sdd` Phase 0; also
covers `frozenSurfaceUnion` / `frozenLicenseCatalog` drift on cycle ≥ 1).

### License-verify hard-stop (exit 66)

`qfai prototyping iterate` exits `66` when an `imageSources[]` entry on
`prototyping.json` violates the cycle-0 frozen license catalog. The
verifier rejects five distinct error codes:

- `license-not-allowlisted` — `source` is not in
  `frozenLicenseCatalog.allowedSources`
- `license-tier-unknown` — `license` is not in
  `frozenLicenseCatalog.licenseTiers[source]`
- `license-non-https-url` — `url` is not HTTPS
- `license-host-mismatch` — the URL host is not in
  `frozenLicenseCatalog.sourceHosts[source]`
- `license-missing-attribution` — `attribution` is undefined / empty /
  whitespace-only

Recovery path (no in-loop retry — the verifier is fail-closed):

1. Inspect `prototyping.json#frozenLicenseCatalog` to see the frozen
   `allowedSources` / `licenseTiers` / `sourceHosts`.
2. Edit the offending `imageSources[]` entry to use an allowlisted
   source / known license tier / HTTPS URL / matching host / non-empty
   attribution. **Do not** edit `frozenLicenseCatalog` mid-loop — that
   triggers a separate exit-2 lock-drift class.
3. If the legitimate fix requires a different allowlist (e.g. adding a
   new source), the only path is to refreeze the catalog by restarting
   from cycle 0 (`qfai prototyping iterate --cycle 0 --target-url <url>`)
   with the updated stock-photo configuration.

### Cycle 9 budget exhaustion

If convergence is not reached at iter-09, the certify gate will reject
the run — H handoff artifacts (final mirror, `design-system.yaml`,
`prototype-handoff.yaml`) and the `validate` / `/qfai-verify` gates can
still be written / executed for inspection, but
`qfai prototyping certify --check` will exit non-zero and prevent DONE.

Use `qfai prototyping iterate --cycle 9 --check-convergence` for a
read-only peek of `prototyping.json` before deciding to refreeze:
exit `0` confirms `stopReason === "axes-exceptional"` (no recovery
needed), exit `2` confirms the run did not converge and the
cycle-0 restart path below is the only path forward.
The recovery path is to restart from cycle 0: review `DESIGN.md`, the
pivot strategy in `references/reviewer-prompt.md`, and the latest
`review.json` findings, then re-run `qfai prototyping iterate
--cycle 0 --target-url <url>` to refreeze the loop. Do not seal a
completion certificate against an unconverged iter-09.

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
- Check `.qfai/assistant/catalog/test-layers.md` alignment.
- Treat reviewer findings as signals, not gates, unless
  certify/validate/verify fails.

## Completion

DONE = `completion-certificate.json` exists AND
`qfai prototyping certify --check` returns 0 AND `/qfai-verify` returns
PASS.

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Next

- `/qfai-atdd` / `/qfai-implement` / `/qfai-verify`

project_memory:

- Iteration count cap is 10; --cycle is 0-indexed; reaching cycle 9 on a non-converged iteration set exits 65 directly (no cycle-mismatch path).
- review.json schema-v3 is the only accepted shape; pre-v3 payloads, unknown layoutAntiPatterns codes, or wrong-enum designMdViolations entries fail validate with QFAI-PROT-002.
- DESIGN.md lock sha256 is re-checked every cycle against the live DESIGN.md; mismatch exits 2 and stops the loop.
