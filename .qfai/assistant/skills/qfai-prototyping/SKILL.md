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
a frozen brand SSOT (`DESIGN.md`) and a frozen spec set, one lineage per
`spec × screen` pair, no parallel candidates, no mode, fixed 10-cycle
budget. Supported surfaces: web, mobile, desktop, mixed. cli surface is
rejected and `ui_bearing: false` specs are excluded from prototyping
execution.

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
  consuming-project root by `npx qfai init`

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

- The skill resolves **every UI-bearing spec in one invocation** via
  `resolveAllUiBearingSpecs()` (`core/prototyping/specResolution.ts`):
  strict `surface_type: ui-bearing` frontmatter + matching
  `.qfai/contracts/ui/<spec-id>*.yaml`, with legacy title-marker and
  `qfai.config.yaml` `prototyping` pinning folded in. Run
  `npx qfai doctor --profile prototyping` to surface the resolved value.
  Zero UI-bearing specs at cycle 0 is a deterministic no-op exit `0`.
  Confirm each resolved spec has a supported `surface`.
- Confirm root `DESIGN.md` and `.qfai/contracts/design/DESIGN.md.lock.yaml`
  both exist; confirm `.qfai/contracts/ui/*.yaml` exists.
- Run `npx qfai prototyping preflight --target-url <url>` (alias for
  `npx qfai doctor --profile prototyping`) — verifies DESIGN.md parses and
  matches the lock sha256.

### Step 2-B — Verify Environment Preconditions

- Confirm a capture route exists for each declared screen.
- Canonical launcher: `npx --no-install playwright` or
  `node_modules/.bin/playwright` when PATH reachability is uncertain.
- `playwright-cli` was the legacy fallback. Its deprecation window closed:
  `browserTool: "playwright-cli"` is now rejected by config load and
  `D-DEPRECATED-PROBE` reports `error`. Install `playwright`
  (`npm i -D playwright`) rather than reaching for it.

### Step 2-B.1 — Opt-in iterate flags

Three flags extend `npx qfai prototyping iterate`; all default OFF so the
prior invocation pattern is byte-equivalent when no flag is passed:

- `--capture` — enable PNG / HTML capture per screen each cycle via
  the default Playwright runner (dynamic `import("playwright")`;
  Playwright is `optionalDependencies`). Use for durable pixel / DOM
  evidence; skip for fast prose-only cycles.
- `--auto-serve` — start an in-process `node:http` server rooted at
  the prototype tree for the cycle. SIGINT teardown <= 2 s;
  EADDRINUSE on a foreign owner exits 2 (no foreign-process kill).
  Use when no external dev server is running. Routing is SPA-style:
  a document request (GET/HEAD with `text/html` in `Accept`) that
  matches no file on disk is served `index.html`, so client-side and
  parameterized contract routes (`/overview`,
  `/pairs/:instrument`) resolve instead of 404-ing. Sub-resource
  requests (`.css`, `.png`, `fetch()`) still 404 when genuinely
  missing, and the path-traversal 403 guard runs first.
- `--check-convergence` — read-only peek of `prototyping.json`.
  Exits `0` when converged (`stopReason === "axes-exceptional"` with
  `acceptedIterationIndex` set), exits `2` otherwise. No writes,
  no Playwright launches. Use at cycle 9 before recovery.

### Step 2-C — Run the Loop

| Step  | Actor                                                     | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Output                                   |
| ----- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| C0    | product-experience-architect                              | `npx qfai prototyping iterate --cycle 0 --target-url <url>`. CLI computes `sha256(DESIGN.md)`; lock match enforced. Generator reads contracts + `references/generator-prompt.md` + DESIGN.md tokens and writes `.qfai/prototypes/iter-00/index.html`. Capture + review → `iter-00/review.json`. REPLACE the seed `iterations[0]` per "Transcription" below; commit `prototyping: iter-00`.                                                                                                                                                                                                                  | iter-00, prototyping.json#designMdSha256 |
| C1..9 | (a) devops, (b) reviewer, (c) orchestrator, (d) generator | (a) playwright writes `iter-NN/<screen>.{png,html}`; (b) reviewer writes `iter-NN/review.json` per `references/reviewer-prompt.md` (4 UX axes ordinal, 200..500 word critique, `layoutAntiPatternsDetected[]`, `designMdViolations[]`, `pivotDirective`); (c) transcribe it into `prototyping.json#iterations[]` per "Transcription" below, update `progress.md`, commit `prototyping: iter-NN`; (d) `npx qfai prototyping iterate --cycle <n+1>` decides exit. After C9 do NOT call `--cycle 10` — the CLI rejects out-of-range cycles. See the "Cycle 9 budget exhaustion" subsection below for recovery. | iter-NN, exit ∈ {0, 64, 65, 66, 2}       |
| H     | orchestrator                                              | Mirror latest to `.qfai/prototypes/final/index.html`. Per `references/handoff.md`: write `design-system.yaml` (deterministic DESIGN.md token mirror, no HTML extraction) + `prototype-handoff.yaml`. Run `npx qfai validate --profile prototyping --fail-on error` (produces `validate.json` with `counts.error === 0`), then `/qfai-verify` (produces `verify.json` with `status === "PASS"`), then `npx qfai prototyping certify` — certify requires both gate files to be present and passing before it will seal the certificate.                                                                       | DONE                                     |

### Transcription (C0, and C1..9 step c)

`prototyping.json#iterations[]` is a MIRROR of `iter-NN/review.json`, and
`validate` compares them field by field. Copy **all seven** verbatim —
`reviewerId`, the four `scores`, `proseCritique`, `layoutAntiPatternsDetected[]`,
`designMdViolations[]`, `pivotDirective`, `evidenceRefs` — including
`evidenceRefs` in the full repository-relative form the reviewer wrote. A field
left at its previous value is reported as a mirror disagreement, and the
reviewer's value is the one to keep.

Two specifics that are easy to get wrong:

- **Cycle 0 REPLACES `iterations[0]`, it does not append.** `iterate --cycle 0`
  has already written a seed record there, so appending leaves two index-0
  entries and fails QFAI-PROT-004.
- **`reviewerId` must be overwritten.** The seed carries `iterate-seed`, and
  leaving it in place on a reviewed record used to waive the whole
  reviewer-deliverable gate for that iteration. It no longer does — the
  exemption now requires the record to still BE the untouched seed — so a
  stale stamp is reported rather than obeyed, but it is still wrong.

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

### Scope reduction has no in-loop path

The drift rule above is symmetric, and scope **reduction** is not. When a
product decision retires a screen while the loop is open, there is no
subcommand, flag or protocol for "this surface is retired; carry the loop
forward without it". The only route is a full reset:

```bash
npx qfai prototyping iterate --cycle 0 --target-url <url> --force
```

which moves `iter-00` to `iter-00.backup-<ISO>` and discards every cycle of
review already paid for.

Plan for it. `qfai validate --profile prototyping` reports `QFAI-PROT-011` as
soon as `frozenSurfaceUnion` names a spec that no longer resolves as
UI-bearing, so the state is visible before the next `iterate` — which is the
point of no return. Two ways out at that point:

- **restore** the retired spec's UI-bearing marker, keeping the loop and every
  recorded iteration; or
- **reset** deliberately from cycle 0, accepting the backup.

`iterate` itself only hard-stops when **every** UI-bearing spec has
disappeared. A partial reduction passes that check, which is why the finding
exists.

### License-verify hard-stop (exit 66)

`npx qfai prototyping iterate` exits `66` when an `imageSources[]` entry on
`prototyping.json` violates the cycle-0 frozen license catalog. The
verifier rejects five distinct error codes:

- `license-not-allowlisted` — `source` not in `allowedSources`
- `license-tier-unknown` — `license` not in `licenseTiers[source]`
- `license-non-https-url` — `url` is not HTTPS
- `license-host-mismatch` — URL host not in `sourceHosts[source]`
- `license-missing-attribution` — `attribution` empty / whitespace

Recovery path (no in-loop retry — the verifier is fail-closed):

1. Inspect `prototyping.json#frozenLicenseCatalog` for the frozen
   `allowedSources` / `licenseTiers` / `sourceHosts`.
2. Edit the offending `imageSources[]` entry to use an allowlisted
   source / known tier / HTTPS URL / matching host / non-empty
   attribution. **Do not** edit `frozenLicenseCatalog` mid-loop
   (separate exit-2 lock-drift class).
3. To change the allowlist, refreeze the catalog by restarting from
   cycle 0 with the updated stock-photo configuration.

### Cycle 9 budget exhaustion

If convergence is not reached at iter-09, certify rejects the run; H
handoff artifacts and `validate` / `/qfai-verify` can still execute for
inspection, but `npx qfai prototyping certify --check` will exit non-zero
and prevent DONE.

Use `npx qfai prototyping iterate --cycle 9 --check-convergence` for a
read-only peek of `prototyping.json` before refreezing: exit `0`
confirms convergence (no recovery needed), exit `2` confirms the run
did not converge. Recovery: review `DESIGN.md`, the pivot strategy
in `references/reviewer-prompt.md`, and the latest `review.json`
findings, then re-run `npx qfai prototyping iterate --cycle 0
--target-url <url>` to refreeze. Do not seal a certificate against
an unconverged iter-09.

### Continuing or resetting a converged loop

Only `stopReason: "axes-exceptional"` + `acceptedIterationIndex` seals a loop; `iterate --cycle N`
then refuses with exit `2` past the accepted index, writing nothing. `license-verify-fail` /
`input-error` do NOT seal — fix the cause and re-run the same cycle.
`max-iterations` does not seal either, but iter-09 still stops every `--cycle N >= 1` at exit `65`.
Recovery for both is the cycle-0 reset; re-running the accepted cycle is reported by the convergence
gate (exit `64`) and writes nothing, so it is a state read, not a rerun. The reset command, the
`--force` requirement and the `certify` alternative are in `references/iteration-loop.md#sealed-loop`.

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
- Token-only colors / fonts / radii / shadows — non-DESIGN.md hex /
  rgb / rgba / hsl / font / radius / shadow values land in
  `designMdViolations[]` and block exit 64.
- DONE only when `npx qfai prototyping certify --check` returns 0.
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
`npx qfai prototyping certify --check` returns 0 AND `/qfai-verify` returns
PASS.

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Next

- `/qfai-atdd` / `/qfai-implement` / `/qfai-verify`

## Default Autopilot Policy

The skill collapses avoidable per-session prompts to 0-1 by classifying every decision into one of three named buckets:

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - `companyName`
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow the auto-decide bucket (drop entries) but MUST NOT widen it. Widening triggers a Reviewer-Gate finding.

project_memory:

- Iteration count cap is 10; --cycle is 0-indexed; reaching cycle 9 on a non-converged iteration set exits 65 directly (no cycle-mismatch path).
- `iter-NN/review.json` is validated directly, against the shape in `references/reviewer-prompt.md`. A missing or unparseable file, an unknown `lap-*` code, a wrong-enum `designMdViolations` entry, an out-of-band `proseCritique`, or a `prototyping.json#iterations[N]` that disagrees with the reviewer's file all fail validate with QFAI-PROT-002. `iterations[]` is a transcription of `review.json`, so on a disagreement the reviewer's value is the one to keep. The cycle-0 seed (`reviewerId: iterate-seed`) is exempt: no reviewer has run yet.
- DESIGN.md lock sha256 is re-checked every cycle against the live DESIGN.md; mismatch exits 2 and stops the loop.
