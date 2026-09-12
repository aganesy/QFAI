---
name: qfai-prototyping
title: QFAI Prototyping (DESIGN.md-driven UX Loop)
description: "Iterate one prototype through up to 10 cycles of generate-capture-review against a frozen DESIGN.md, focusing on information architecture, navigation flow, usability, and functionality."
argument-hint: ""
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
roles:
  [
    orchestrator,
    product-experience-architect,
    product-surface-reviewer,
    devops-ci-engineer,
    completion-reviewer,
  ]
routing-profile: ui-bearing
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

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- DESIGN.md lock drift / conflict resolution (exit `2` recovery)
- hard-required inputs absent at cycle 0 (brand intent — see the
  hard-required bucket under `## Default Autopilot Policy`)

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`
- P2: `.qfai/assistant/manifest/agent-routing.yml` + `.qfai/assistant/manifest/review-profiles.yml` + `.qfai/assistant/catalog/*`; from `.qfai/assistant/manifest/agent-catalog.yml` read the acting `orchestrator`'s and each routed role's entry (`owned_artifacts` / `tool_profile` / `permission_profile` / `specialization_tags`), not the whole file — its `developer_instructions` bodies mirror the agent cards (`.qfai/assistant/constitution/constitution.md` Article III)
- P3: root `DESIGN.md` + `.qfai/contracts/design/DESIGN.md.lock.yaml` — the locked brand identity, which the loop refuses to run against a mismatched hash
- P4: the rest of `## Required Contracts` (`.qfai/contracts/ui/*.yaml`, `.qfai/specs/spec-*/{01_Spec.md, 03_Acceptance-Criteria.md}`) and this skill's `## Required References`
- P5: evidence from earlier cycles under `.qfai/evidence/prototyping/`

## Goal

One final prototype satisfying the spec under a locked brand identity, with no blocking review finding, no layout anti-pattern, and no DESIGN.md violation.

## What is grilled, and what is prototyped

This skill exists for the questions talking cannot settle. "How should this
feel" and "one long form or three pages" need something to react to, and no
amount of rephrasing turns them into answerable ones — talking through one is
where a session balloons, because the agent rephrases, the user guesses, and the
scope grows to fill the uncertainty.

The questions around it can be settled by talking, and are grilled before the
loop starts, through the `qfai-grilling` skill. The method is
`.agents/rules/grilling.md`, and the session's own decisions are classified
there rather than in this skill's buckets — they are the session's operations,
not this one's.

**Only what the inputs leave open.** The specs, the UI contracts and `DESIGN.md`
are read first, and a question they answer is not on the frontier: the method
reads a fact rather than asking about it, and a session that re-opens a frozen
requirement produces an answer that drifts from it. What is left is what the
session is for.

| Settled by talking, before the loop | Made answerable by the loop, settled by the user against it |
| ----------------------------------- | ----------------------------------------------------------- |
| What the prototype is for           | How it should feel                                          |
| What would count as better          | Which layout carries the task                               |
| What is out of bounds               | Which of two shapes reads faster                            |

Running the loop on the left column wastes cycles: the loop answers by building,
and building is the expensive way to learn something a sentence would have
settled. Grilling the right column is the error the rule master names, and it
costs a session rather than a cycle.

**The prototype makes a decision answerable; it does not take it.** Put the
result in front of the user and ask the question again against it. An agent that
builds one, judges it, and carries on has settled a question of taste on the
user's behalf — with more evidence than before, and still not the user's answer.

**The session's answers are written down, and the loop reads them.** They go to
`.qfai/evidence/prototyping/grilling.md`, under `## Session` for the decisions
and `## Escalated` for anything the user has yet to settle. The generator and
the reviewer both take that file as an input — named in `## Evaluator Inputs`
and in the generator's contract set — because a decision the loop cannot read
is one it will contradict on the next cycle, and the user will be asked to
re-settle what they already settled.

**Every row names what it applies to**, because one invocation runs a lineage
per `spec × screen` and a reader that cannot tell whose answer a row is applies
all of them to each:

| Scope                | Decision | Answer |
| -------------------- | -------- | ------ |
| `<spec-id>/<screen>` | ...      | ...    |
| `<spec-id>`          | ...      | ...    |
| `global`             | ...      | ...    |

`global` is a real answer and not a default — what the whole prototype is for is
usually one — so it is written rather than assumed from a missing key. A
generator or reviewer reads the rows matching its own lineage plus the `global`
ones, and nothing else.

**The file is written before C0, empty session or not.** Where the frozen
inputs answered everything, it carries the heading and `none` under it, which
is a different statement from a file that is not there — a required input a
delegated role cannot find is an error it has to guess its way past, and
guessing is what the record exists to stop.

**It is a user decision, not stage evidence.** Stage evidence is regenerable
and ignored; these answers are not reproducible by re-running anything, and
every later generator and reviewer is required to read them. The managed
ignore block negates this path so it survives a fresh clone, another worktree
and a later checkout.

The scope floor is unchanged: which specs the loop covers is decided where it
was, and no session narrows it.

## Required References

- `references/iteration-loop.md` — flow, exit codes, evidence paths
- `references/generator-prompt.md` — generator system prompt + Tailwind
  CDN + DESIGN.md token injection rules
- `references/reviewer-prompt.md` — reviewer schema, 4 UX axes,
  layout anti-patterns (static regex and reviewer-judged entries),
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
  its `resolveAllUiBearingSpecs()` resolver: strict
  `surface_type: ui-bearing` frontmatter + matching
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

### Step 2-B.1 — `iterate` flag surface

The flags below extend `npx qfai prototyping iterate`. `--target-url` is
required at cycle 0 once at least one UI-bearing spec resolves; every
other flag is opt-in and defaults OFF, so the prior invocation pattern is
byte-equivalent when no opt-in flag is passed. This list is the flag
reference for the sub-command — when it and `npx qfai --help` disagree,
the help text wins and this section is stale.

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
  Exits `0` when converged (`stopReason === "converged"` with
  `acceptedIterationIndex` set), exits `2` otherwise. No writes,
  no Playwright launches. Use at cycle 9 before recovery.
- `--target-url <url>` — base URL the capture / review steps drive.
  Required at cycle 0 whenever at least one UI-bearing spec resolves;
  the zero-UI cycle-0 no-op exits `0` before this gate, so a project
  with no UI surface needs no URL. Also required at cycle >= 1 whenever
  `--capture` is set and a screen `url` is route-relative. Used
  throughout Step 2-C.
- `--force` — **required**, not optional, to re-run cycle 0 once an
  `iter-00` exists: the destructive-rerun gate refuses to overwrite it
  otherwise. Backs `iter-00` up to `iter-00.backup-<ISO>` and clears
  stale `iter-NN` directories. Detail:
  `references/iteration-loop.md#sealed-loop`.
- `--dry-run` — plan the cycle and write nothing. Reports what a real
  run would create, move or overwrite — including the `iter-00` backup
  `--force` would take — and exits without touching the tree. Use it to
  read a destructive cycle-0 re-seed before authorising it.
- `--license-patch <file>` — apply an add-only patch to the license
  allowlist. Usable at **any** cycle, not only cycle 0: broaden the
  catalog mid-loop instead of discarding progress with
  `--cycle 0 --force`. The model is immutable baseline + audit overlay:
  the frozen catalog stays byte-equal to the shipped default and the
  patch is appended to the audit ledger, from which the effective
  allowlist is rebuilt on every cycle. Audit and back up the ledger
  too — the frozen catalog alone omits every added permission. The
  overlay covers sources and tiers only: a patch never pins
  `sourceHosts`, and a `--cycle 0 --force` re-seed does not revoke
  earlier rows. Never hand-edit the frozen catalog; that is a
  lock-drift exit 2. See "License-verify hard-stop (exit 66)" below.
- `--primary-spec-id <NNNN>` — compatibility escape hatch, not the
  normal path. Step 2-A runs every UI-bearing spec in one invocation;
  this flag pins the one spec cycle 0 treats as primary, so it narrows
  the run and never widens it. Reach for it only when resolution lands
  on the wrong spec. Accepts digits only (`12`, `0012`, both normalised
  to `0012`) — a `spec-` prefix is rejected before resolution. Takes
  precedence over the equivalent `qfai.config.yaml` pin under
  `prototyping`.
- `--emit-skeletons` — cycle 0 only: write one placeholder HTML file
  per declared screen as a seed aid, not an alternative output shape.
  Ignored at cycle >= 1. Detail:
  `references/generator-prompt.md`.
- `--skeleton-mode <placeholder|full|stub>` — output mode for
  `--emit-skeletons` (default `placeholder`). No effect without it.
- `--mode <convergence|exploration>` — loop posture, default
  `convergence`. `exploration` relaxes the soft-rubric gates to
  warning, i.e. it changes which gates block. It only takes effect at
  cycle 0: the resolved posture is recorded once on the seed iteration,
  and passing the flag at cycle >= 1 merely echoes the resolved value —
  it neither switches the loop into exploration nor clears a recorded
  one. `npx qfai prototyping certify` exits `2` on any loop that
  contains an exploration iteration, and the only way back is a fresh
  `--cycle 0 --force` re-seed. Never reach for it to clear a failing
  gate on a loop you intend to certify.

### Step 2-C — Run the Loop

| Step  | Actor                                                     | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Output                                                                           |
| ----- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| C0    | product-experience-architect                              | `npx qfai prototyping iterate --cycle 0 --target-url <url>`. CLI computes `sha256(DESIGN.md)`; lock match enforced. Generator reads contracts + `.qfai/evidence/prototyping/grilling.md` + `references/generator-prompt.md` + DESIGN.md tokens and writes `.qfai/prototypes/iter-00/index.html`. Capture + review → the reviewer writes BOTH `iter-00/<spec-id>/<screen>.review.json` (one per (spec, screen) pair) and the per-cycle summary `iter-00/review.json` aggregated from them, exactly as in row C1..9 — cycle 0 can itself converge, and certify rejects the run (exit 64) when a declared pair has no payload. REPLACE the seed `iterations[0]` per "Transcription" below; commit `prototyping: iter-00`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | iter-00, prototyping.json#designMdSha256                                         |
| C1..9 | (a) devops, (b) reviewer, (c) orchestrator, (d) generator | (a) playwright writes `iter-NN/<screen>.{png,html}`; (b) reviewer writes BOTH `iter-NN/<spec-id>/<screen>.review.json` (one per (spec, screen) pair; closed schema in `references/review-payload-schema.md`; required by certify) and the per-cycle summary `iter-NN/review.json` aggregated from them, per `references/reviewer-prompt.md` (4 UX axes ordinal, a critique of at most 500 words, `layoutAntiPatternsDetected[]`, `designMdViolations[]`, `pivotDirective`); (c) transcribe them into `prototyping.json#iterations[]` per "Transcription" below, update `progress.md`, commit `prototyping: iter-NN`; (d) `npx qfai prototyping iterate --cycle <n+1>` decides exit. After C9 do NOT call `--cycle 10` — the CLI rejects out-of-range cycles. See the "Cycle 9 budget exhaustion" subsection below for recovery.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | iter-NN, exit ∈ {0, 64, 65, 66, 2}                                               |
| U     | orchestrator                                              | **Resume the session against the converged prototype**: the reaction and everything it raises are a new frontier, not one question — convergence can make several decisions answerable at once, and `.agents/rules/grilling.md` ends a session on an empty frontier and the user's confirmation rather than on one answer. Put that frontier back to the user, through `AskUserQuestion` where it is callable and the rule's fallback where it is not. Blocking: `H` does not start until the session ends — the frontier empty and the user confirming. Record the answer in `.qfai/evidence/prototyping/grilling.md` under `## Session`, **replacing any row with the same `Scope` and decision rather than adding beside it, and removing its row from `## Escalated`** — the file is the current state of the tree, not its history. Two answers to one decision, or a decision left in both sections, read as contradictory or as settled-and-open to every later reader, the delegated prompts included: they consume every row matching their lineage, so a superseded pivot still steers the next cycle. **Closed** — `proceed` or `done` — finishes the running lookups and records every other decision still open as a labelled assumption: the user ended the asking, not the work, and a reset would be work they did not ask for. **This question is not among them.** It is what the loop was run to answer and it is this skill's own `ask-user` operation, so it is asked again and its answer takes the accepted or rejected route below — a closure cannot assume the one choice the whole run exists to obtain. **Stopped** — the user said `stop` — ends the run there: report every open decision as open and do not reset, because a stop ends the session immediately and a reset is further work. **Accepted** — the prototype is what they picked — goes to `H`. **Anything else** — rejected, or a direction this prototype does not implement — takes the cycle-0 reset (`references/iteration-loop.md#sealed-loop`), carrying their answer as the pivot. **Ask for the reset before running it**, naming what it destroys: it keeps `iter-00` and deletes `iter-01` upward, so every later capture, review payload and critique goes. That is a destructive operation, and answering a design question is not consent to one. Not the next `C1..9`: convergence seals the loop, and `iterate --cycle N` past the accepted index exits `2` without writing, so a next-cycle route would refuse the one command that can build what they asked for. Cycle 0 is the documented escape hatch out of a sealed loop, and the CLI restarts the cycle count with it — so the ten-cycle budget is counted across resets here, not per reset. When it is spent, stop and escalate rather than resetting again: an unbounded chain of ten-cycle loops is the budget removed, by the one route that looks like following it. The reason the route exists at all: recording a choice in `grilling.md` does not change the HTML, and certifying the unchanged iteration would ship the design they turned down. Cycle 9 bounds this like any other cycle. Under a no-question mode nobody can answer, so the choice is written to `## Escalated` and the run stops there rather than certifying a design nobody picked — convergence is the reviewer's verdict on four axes, not the user's on the question. | closed → ask again; stopped → end; accepted → `H`; anything else → cycle-0 reset |
| H     | orchestrator                                              | Mirror latest to `.qfai/prototypes/final/index.html`. Per `references/handoff.md`: write `design-system.yaml` (deterministic DESIGN.md token mirror, no HTML extraction) + `prototype-handoff.yaml`. Run `npx qfai validate --profile prototyping --fail-on error` (produces `validate.json` with `counts.error === 0`), then `/qfai-verify` (produces `verify.json` with `status === "PASS"`), then `npx qfai prototyping certify` — certify requires both gate files to be present and passing before it will seal the certificate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | DONE                                                                             |

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

**Exit codes**: `0` continue (read `pivotDirective`); `64` convergence
(`designMdViolations`, `layoutAntiPatternsDetected` and `blockingFindings`
all empty); `65` 10 cycles reached; `66` license-verify
failure (`imageSources[]` resolved to a non-allowlisted source, unknown
license tier, non-HTTPS URL, host mismatch vs the frozen
`sourceHosts` (host pinning is never patched — see below), or
missing / empty `attribution` — see "License-verify
hard-stop (exit 66)" below for recovery); `2` input error or lock drift
(incl. DESIGN.md hash mismatch — re-run prototyping from cycle 0 after
editing `DESIGN.md` and refreezing the lock via `/qfai-sdd` Phase 0; also
covers `frozenSurfaceUnion` / `frozenLicenseCatalog` drift on cycle ≥ 1).

### Scope reduction: `prototyping rescope`

The drift rule above is symmetric, and scope **reduction** is not. When a
product decision retires a screen while the loop is open, the frozen union
still names it — and editing that union by hand is the exit-2 drift the rule
exists to catch. `rescope` is the operation that applies such a decision
without discarding the loop:

```bash
npx qfai prototyping rescope --remove 0011 --reason DELTA-022
```

It drops the surface from `frozenSurfaceUnion`, prunes it from any captured
`iterate-plan.json#screens`, records `{surface, reason, cycle, at}` in
`prototyping.json#rescopeLog`, and **leaves the loop at its current cycle**.
`--remove` is repeatable; `--reason` is required and should cite the recorded
delta or decision that retired the surface. `--dry-run` reports without
writing.

**Order matters.** Retire the surface upstream first — the spec, its UI
contract and its route — then run `rescope`. It refuses a surface that still
resolves as UI-bearing, because dropping one that still exists is exactly the
drift the frozen union detects. It also refuses a sealed loop (`stopReason`
set): a completed loop's scope is history.

**It never rewrites a critique.** What a reviewer saw at cycle N is a
historical fact, so affected `iter-NN/review.json` files get a
`retiredSurfaces` annotation and their `proseCritique` is left exactly as
written. A reader can then tell a stale claim from a wrong one.

`npx qfai validate --profile prototyping` reports `QFAI-PROT-011` as soon as
`frozenSurfaceUnion` names a spec that no longer resolves, so the state is
visible before the next `iterate` rather than at it. Three ways out:

- **rescope** — the decision was real; apply it and keep every recorded
  iteration;
- **restore** the retired spec's UI-bearing marker — the decision was not meant
  to remove this surface; or
- **reset** deliberately from cycle 0
  (`npx qfai prototyping iterate --cycle 0 --target-url <url> --force`), which
  moves `iter-00` to `iter-00.backup-<ISO>` and discards every cycle of review
  already paid for. Still available, still destructive.

`iterate` itself only hard-stops when **every** UI-bearing spec has
disappeared. A partial reduction passes that check, which is why the finding
exists.

### License-verify hard-stop (exit 66)

`npx qfai prototyping iterate` exits `66` when an `imageSources[]` entry on
`prototyping.json` violates the **effective** license catalog: the
immutable `frozenLicenseCatalog` baseline unioned with every
`licensePatchAudit[]` row. The verifier rejects five distinct error
codes:

- `license-not-allowlisted` — `source` not in `allowedSources`
- `license-tier-unknown` — `license` not in `licenseTiers[source]`
- `license-non-https-url` — `url` is not HTTPS
- `license-host-mismatch` — URL host not in `sourceHosts[source]`
- `license-missing-attribution` — `attribution` empty / whitespace

Recovery path (no in-loop retry — the verifier is fail-closed):

1. Inspect `prototyping.json#frozenLicenseCatalog` **and**
   `prototyping.json#licensePatchAudit[]`: the effective
   `allowedSources` / `licenseTiers` is the baseline plus every audit
   row, so the frozen field alone omits every permission a
   `--license-patch` already added. `sourceHosts` is the exception —
   an audit row persists no hosts, so the effective `sourceHosts` stays
   exactly the baseline and a patch-added source carries **no** host
   binding. The verifier skips the host check for a source with no
   `sourceHosts` entry, so any HTTPS host passes under that source
   name; host pinning for an added source is not available today.
2. Edit the offending `imageSources[]` entry to use an allowlisted
   source / known tier / HTTPS URL / matching host / non-empty
   attribution. **Do not** edit `frozenLicenseCatalog` mid-loop
   (separate exit-2 lock-drift class).
3. To broaden the allowlist, apply an add-only `--license-patch` at the
   current cycle — no cycle-0 restart. Deletions / modifications inside
   a patch file are rejected outright. Revoking an already-applied
   permission is a manual step: `--cycle 0 --force` re-seeds the loop
   but does **not** clear `licensePatchAudit[]`, so every prior row is
   unioned back in from cycle 1. Delete (or archive elsewhere) the
   offending rows from `prototyping.json#licensePatchAudit[]` yourself
   as part of the re-seed — that array is not covered by the lock-drift
   gate, unlike `frozenLicenseCatalog`.

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

Only `stopReason: "converged"` + `acceptedIterationIndex` seals a loop; `iterate --cycle N`
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
  `axisDefs`, `previousScore`, `designSystemChecklist`, and
  `.qfai/evidence/prototyping/grilling.md` — what the prototype is for, what
  counts as better, and what is out of bounds. The four axes are fixed and say
  nothing about this prototype's purpose, so a reviewer without that file grades
  every prototype against the same generic bar.

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
  - the choice a finished prototype was built to make answerable, asked again against it — this
    skill's own operation, because it is what the loop was run to produce
  - the cycle-0 reset a rejected choice needs, which deletes `iter-01` upward — a destructive
    operation, and one the design answer does not consent to
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry — `approval-required governance operations` — with the
operations its own run cannot authorize for itself. `hard-required` also takes the
undefaultable inputs this skill itself consumes, declared per skill and checked against
that declaration; the bucket is what a run cannot proceed without, and no prototype can
enumerate that for a skill it does not know. Otherwise a skill MUST NOT introduce an
entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

project_memory:

- Iteration count cap is 10; --cycle is 0-indexed; reaching cycle 9 on a non-converged iteration set exits 65 directly (no cycle-mismatch path).
- `iter-NN/review.json` is validated directly, against the shape in `references/reviewer-prompt.md`. A missing or unparseable file, an unknown `lap-*` code, a wrong-enum `designMdViolations` entry, an out-of-band `proseCritique`, or a `prototyping.json#iterations[N]` that disagrees with the reviewer's file all fail validate with QFAI-PROT-002. `iterations[]` is a transcription of `review.json`, so on a disagreement the reviewer's value is the one to keep. The cycle-0 seed (`reviewerId: iterate-seed`) is exempt: no reviewer has run yet.
- DESIGN.md lock sha256 is re-checked every cycle against the live DESIGN.md; mismatch exits 2 and stops the loop.
