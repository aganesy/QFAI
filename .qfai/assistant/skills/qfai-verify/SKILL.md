---
name: qfai-verify
title: QFAI Verify (Quality Gates + Evidence)
description: "Run and document quality gates (repo + qfai validate/report), fix until PASS."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Bash, Write, Edit, TodoWrite, Task, Agent]
roles:
  [
    orchestrator,
    delivery-planner,
    qa-strategist,
    devops-ci-engineer,
    completion-reviewer,
    qa-gatekeeper,
    implementation-reviewer,
  ]
routing-profile: runtime-heavy
mode: evidence-focused
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-verify — Quality Gates and Evidence

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- gate failure triage
- fix approach confirmation

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#format-ssot-mandatory`.

- Before writing or editing any `.qfai/**` artifact, read the relevant skill-local reference or template:
  - `.qfai/assistant/skills/qfai-discussion/references/discussion-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/contract-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-prototyping/references/iteration-loop.md`

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`, and `.qfai/assistant/skills/qfai-grilling/SKILL.md` before the preflight round (see Grilling)
- P2: `.qfai/assistant/manifest/agent-routing.yml` + `.qfai/assistant/manifest/review-profiles.yml` + `.qfai/assistant/catalog/*`; from `.qfai/assistant/manifest/agent-catalog.yml` read the acting `orchestrator`'s and each routed role's entry (`owned_artifacts` / `tool_profile` / `permission_profile` / `specialization_tags`), not the whole file — its `developer_instructions` bodies mirror the agent cards (`.qfai/assistant/constitution/constitution.md` Article III)
- P3: `.qfai/specs/<spec-id>/07_Decisions.md` + `.qfai/specs/_policies/08_Decisions.md` (Decision Records, `DR-*`; if no spec yet, state "not applicable")
- P4: other artifacts (01_Spec.md, contracts, evidence, optional legacy `scenario.feature` / coverage ledgers)

## Verify Scope Rule (Mandatory)

- `/qfai-verify` MUST always run full-scan verification **within the declared scope**.
- Do NOT use Preflight Diff (or any diff-only shortcut) in this skill.
- Preserve the verify-as-safety-gate intent: verify must not be reduced to incremental checks.
- "Full-scan" means every gate that applies to the current stage, not every gate in the repository regardless of stage. Each scope names the profile that produces it, and they must match — a `full`-profile run is recorded as `scope: "full"` whatever stage triggered it.
- **Prototyping carve-out (local only — see "Mandatory checks": CI rejects narrow profiles).** When `/qfai-verify` is invoked to satisfy the prototyping DONE gate — i.e. Work Order H of `/qfai-prototyping`, before `npx qfai prototyping certify` — the scope is `prototyping`, and the validate run is `npx qfai validate --profile prototyping --fail-on error`. This is NOT a diff-only shortcut and NOT a waiver: it is the phase-isolation contract the certify gate enforces (`prototypingCertify.ts` accepts only `scope="prototyping"`, and `reviewerGate.ts` raises `R-CERTIFY-VERIFY-CIRCULAR` at severity `error` when a `verify.json` carrying `atdd` / `full` / `implement` is present while a prototyping loop is active). A `full` run at that point necessarily fails `QFAI-ATDD-111/112/113`, which are obligations of stage 5 (`/qfai-atdd`) — a stage that has not run yet. Do not clear them with annotation-only tests; declare the prototyping scope instead.

## Verify Output Contract — `.qfai/report/verify.json`

`/qfai-verify` MUST write `.qfai/report/verify.json` at the end of the run: it is
the machine-readable verdict, and `.qfai/evidence/verify-<spec-id>.md` does not
replace it. `status` is `"PASS"` only when every gate in scope passed, and
`scope` names the stage this run actually covered — never a stage you did not
run.

The field table, the closed `scope` enum, the conforming example and the rules
on what must never be written are in `references/verify-output-contract.md`.
Read it before writing the file.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

### Work Orders Summary (MANDATORY evidence)

Use the shared schema.

### Stage Minimum Roles (MUST)

- Delegate: Runner, ReportWriter create first drafts of execution evidence and verification summary.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-gate-baseline`.
- The stage evidence's `## Grilling Session` section carries `Run started`,
  `Preflight`, a row for every session detection opened, and — when `Preflight`
  says `session opened` — one for the preflight session, all of them inside this run's own block — **except a session the user stopped**, which is reported in the stage's output rather than written, as the table below sets out, so its absence is not a `REVISE`. Every `Ended` is one of the four endings the rule master
  names, every row's `Ended at` is at or after the run-started time on
  a `### /qfai-verify — run started` block whose time equals the one this
  run's work order states, and each row's `Open` count matches the register lines naming that row's `Session`, **and its `Escalated` count matches the escalation lines naming it** — a count checked against nothing lets a row claim `0` over decisions that never reached the user. **A row whose ending lets the work go on, and after which the stage wrote,
  carries a `Work resumed` later than its own `Ended at`** — that ordering is
  the whole reason both times are recorded, and an earlier one is a session
  recorded after the edit it was meant to precede. **A run that did not resume
  writes `none — <why>` instead**, which the gate accepts on those three
  endings and on no other: a session that was the run's last activity has no
  later time to carry, and requiring one would have the stage invent it. A
  blank is neither, and is a `REVISE` — **except on a `stopped` row**, where empty is the value that ending requires and `none — <why>` would claim a decision the stop forecloses. A run that skipped a session leaves the same tree as one
  that ran it, and an evidence file is updated in place, so these are what tell
  a fresh session from an absent one and from last week's.
- **Each ending carries its own condition, and the name alone is not one.** A
  malformed row labelled `confirmed` passes an enum check and fails the rule it
  claims to have met.

  | `Ended`       | What the row must also show                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
  | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `confirmed`   | `Frontier` empty, `Lookups` none in flight, `Open` 0, **and the confirming answer quoted under the table beside that row's `Session`**. Those are the rule master's two completing conditions, and tree state is only the first: a session that closed its own tree and never asked satisfies every count while the user has said nothing                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
  | `user-closed` | `Lookups` none in flight, every open node assumable, **and every one of them carrying its labelled assumption in the register**. The closure covers the tree as it finally stands, so a lookup still running can raise a node after it — and a row accepted while one was in flight is a verdict taken over a register that was not yet complete. A decision some document requires the user to make and record, and an input declared undefaultable, are not assumable — the rule master says the closure does not reach them, so a row carrying one is a `REVISE`. A node listed without the value the stage went on to use is the other half of the same failure: the assumption is then unread, which the rule master calls a decision nobody took wearing the face of one somebody did |
  | `no-question` | `Lookups` none in flight and `Open` 0. Article X, rule 6: the stage cannot complete over a decision nobody took, and nobody was asked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
  | `stopped`     | `Work resumed` empty. The user ended the session, so the stage reports every open node rather than resuming — a `stopped` row with work after it is a `REVISE` whatever it counts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

  **A stopped session is reported, not written.** Article X ends a stopped
  invocation with no further work or file changes, and a row is a file change —
  so the gate requires no row for it, and the stage names the stopped session
  and its open nodes in its own output instead. Where a row for one does exist,
  because the stop arrived after the section was already written, it is held to
  the line above. That is the one place the record is weaker than the tree it
  describes, and it is weaker on purpose: the alternative is an instruction to
  edit a file the user just stopped.

  A `user-closed` row with open nodes otherwise **passes**: the user saw them and
  closed the asking, and the method records each as a labelled assumption.

- Reviewer checks:
  - required roles were delegated;
  - validate evidence exists: `npx qfai validate --profile verify --fail-on error` completed with `error=0` — for a `scope: "prototyping"` run this is `npx qfai validate --profile prototyping --fail-on error` instead, per the prototyping carve-out in "Verify Scope Rule". Requiring the `verify` profile here would reinstate the circular gate: it fails `QFAI-ATDD-111/112/113`, so no reviewer could return PASS before `/qfai-atdd` has run;
  - per-iter evidence (screenshot + HTML + review.json) exists under `.qfai/evidence/prototyping/iter-NN/`, and the recorded final iteration in `.qfai/evidence/prototyping/prototyping.json#iterations[]` has both screenshot and HTML on disk. The completion-certificate is NOT a verify-gate input — `npx qfai prototyping certify` runs AFTER `/qfai-verify` (it requires a passing `verify.json`, which `/qfai-verify` writes to the canonical `.qfai/report/verify.json`). Cert digest validation belongs to `certify --check`, run during the prototyping handoff or after edits to brand assets, not here;
  - Drift Protocol enforced;
  - test-layer policy enforced against `test-layers.md`.
  - gate counts and ratios are signals, not gates.
- Route specialist reviewers from `.qfai/assistant/manifest/agent-routing.yml`.
- Default verify review set:
  - `qa-gatekeeper`
  - `completion-reviewer`
- Add `implementation-reviewer` only when code fixes are in scope.
- Do not declare DONE or handoff until all routed blocking reviewers return `PASS`.

### Work order template (copy/paste)

Use the shared template.

### Reviewer response template

Use the shared template.

- Required field: `Status (PASS/REVISE/PENDING)`. `PENDING` marks a gate that could not be run (see the baseline's reviewer-budget branch); it never counts as `PASS`.

## Stage 0 — Steering completion refresh (mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.

## Delta Rejected Guard (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`.

## Grilling (MANDATORY)

Article IX of `.qfai/assistant/constitution/constitution.md` owns both sessions
this stage runs, and `.agents/rules/grilling.md` owns the method. Neither is
restated here.

- **At the preflight.** A session over what the confidence check left uncertain,
  and nothing else. The bound is on the subject: the spec and the ledger are
  settled input, and re-interrogating them each run would stop the cycle and
  invite the drift this stage avoids.
- **On detection.** A contradiction in the spec, an unconsidered case or a
  technical obstacle surfacing mid-run stops the work and opens a session over
  what was detected, rather than being decided alone.
- **What this stage's session holds, and what it does not.** The decisions of
  this invocation: what evidence a finding needs before it is reported as one,
  and how a gate the environment cannot execute is recorded. **Not which gates
  apply** — the declared scope and the mandatory completion list fix that, and
  whether this environment can run one is a fact to inspect rather than a
  decision to take.
- **Neither session changes settled input.** Where one concludes that settled
  input must change, `.qfai/assistant/constitution/drift-protocol.md` governs:
  stop the dependent work, raise the Change Request, wait for approval. Where it
  concludes the obstacle is this run's to solve, the run solves it — nothing
  upstream changes, so there is nothing to approve.
- **Record both sessions where the gate reads them.** The method writes no
  artifact of its own, so a run that grilled and a run that skipped it leave the
  same tree. `.qfai/evidence/verify-<spec-id>.md` carries a `## Grilling Session`
  section holding one row per session the user did not stop, under two lines the run writes before it
  opens any:

  ```text
  ### /qfai-verify — run started 2026-01-01T09:02:00.417Z

  Preflight: session opened

  | Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
  | ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
  | S1 | confirmed | 2026-01-01T09:14:00Z | a1b2c3d | 2026-01-01T09:15:20Z | preflight | empty | none in flight | 4 | 0 | 0 |
  | S2 | user-closed | 2026-01-01T11:02:00Z | a1b2c3d | 2026-01-01T11:04:10Z | a gate the spec requires and no lane runs | empty | none in flight | 2 | 1 | 0 |

  Confirmed S1: "Yes — that is the understanding."

  Open S2: whether the unrun gate blocks this verdict — assumed: <the value the stage used>
  ```

  The shape `/qfai-discussion` already writes, with `Subject` in place of that
  stage's lone `Authoring began`: this stage holds more than one session, so a
  row says which. `Work resumed` is when the stage next wrote — the first gate result for the preflight session, the
  first edit made after a detected one.

  **Both times, and the second later than the first.** A row holding only the
  ending reads the same whether the session ran before the work or after it,
  because it is written at the end either way. What the pair records is the
  order, which is the part a later reader has no other way to recover. It still
  cannot prove a session happened: the agent writes its own record.

  **The `### <command> — run started <time>` heading is what bounds the
  invocation, and it is one block per stage-invocation.** An evidence file is
  updated in place, so a row left by an earlier run has a valid ending, an
  `Ended at` before its own `Work resumed`, and a consistent count; and a rerun
  over an unchanged tree produces the same `Revision`, because that address is a
  tree address and excludes `.qfai/evidence/**`. Only a value that moves every
  invocation separates the two.

  **To the millisecond, because a retry is immediate.** A run that failed and
  was re-run at once shares a second with the one before it, and two blocks
  carrying the same heading let the earlier one pass as current — which is the
  staleness this heading replaced a revision to fix. Where the host mints a run identifier of its own, the heading carries it **beside** the time, never in place of it: the gate compares every `Ended at` against that time, and an identifier gives it nothing to compare. What neither may be is a value two invocations can share.

  **The run's start goes to the reviewer in its work order, not only into the
  file.** A block carries its own heading, so a gate reading the heading alone
  checks the record against itself: a rerun that wrote no block leaves an
  earlier one internally consistent, and its reviewer has nothing to contradict
  it with. The orchestrator states this invocation's start in every reviewer
  work order it opens, and the gate requires the block heading to carry that
  exact value. An artifact cannot prove its own freshness, and the one value
  that settles it has to arrive from outside the artifact.

  **One block per stage as well as per run**, because two stages share an
  evidence file: an `E2E` / `API` / `Integration` row's proof lives in
  `atdd-<spec-id>.md`, which `/qfai-atdd` wrote its own sessions into and
  `/qfai-implement` later writes to. One table for both would have each stage's
  gate rejecting the other's rows for a start time they never claimed. The gate
  reads this stage's own block and leaves every other block alone, so both
  histories stay in the file and stay valid.

  `Revision` stays beside it, written in the notation
  `.qfai/assistant/skills/qfai-implement/references/evidence-revision.md`
  defines — a git rev, or `working-tree+<hash>` for an uncommitted tree. It says
  which tree the session ended against, which is what a later reader needs to
  reconstruct what was being decided.

  **`Preflight` says whether the confidence check opened a session.** Article IX
  asks its targeted questions _if confidence is low_, so a run that found none
  owes no preflight row — and an absent row and a skipped session look alike
  without a line saying which. It takes `session opened` or `confidence high`,
  and the second is a disposition the reviewer reads rather than an omission it
  cannot see.

  `Ended` is `confirmed`, `user-closed`, `no-question` or `stopped` — the four
  endings `.agents/rules/grilling.md` names — and only the first three let the
  work go on.

- **The confirming answer goes under that table too**, one line per
  `confirmed` row, quoting what the user replied and naming the `Session` it
  closed. A `confirmed` label is a claim about the user rather than about the
  tree, and nothing else in the record can be checked against them.
- **The escalated decisions go under that table too.** One line per decision
  a session between agents sent to the user, naming the `Session` it came from
  and what the user answered, or that no answer has come yet. A decision the
  agents agreed on is among them: agreement between agents settles nothing, so
  it reaches the user like one left open. `Escalated` counts these lines, and
  the gate reconciles the two the way it reconciles `Open` with the register.
- **A free-form cell is one line, with `|` written `\|`.** `Subject` and a
  `none — <why>` disposition are the author's own words, and a pipe or a line
  break in them adds cells to the row, so `Open` and `Escalated` land under the
  wrong headings and the gate reads a valid row as malformed.
- **The open questions go under that table, in the same section.** One line per
  **node** left open — a decision, or a fact only the user holds — naming the
  `Session` it belongs to and carrying the labelled assumption written
  in its place where a document required a value. That is the register this
  stage's gate reads, and it is here so a reader finds the count and the
  questions it counts in one place.

  **Nodes, not decisions.** `.agents/rules/grilling.md` puts a user-held fact on
  the frontier because nothing else can settle it, and a register of decisions
  alone lets a run with one unanswered fact write `Open = 0` and complete.
  `Open` counts the lines.

  **And each line names its session by `Session`**, not by `Subject`. Two rows may
  each carry `Open = 1`, and an unkeyed register satisfies both with one
  question; `Subject` does not fix that either, because a recurring obstacle
  reopens a session under the same description. `Session` is `S1`, `S2`, … in
  the order the sessions opened, and it is unique by construction.

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion without running the defined gates.
- You MUST produce the required evidence file: `.qfai/evidence/verify-<spec-id>.md`.
  - The run-scoped `.qfai/evidence/verify-<spec-id>.md` remains local and ignored by the QFAI-managed block in the project root `.gitignore`.
  - Durable per-item `implement-*.md` and `atdd-*.md` governance records are committed through the managed negations. Do not commit the verify run file; summarize its key outcomes in the PR description instead.
- You MUST write `.qfai/report/verify.json` per "Verify Output Contract" above. Downstream gates read that file, not the evidence markdown.
- You MUST run the mandatory checks listed below and record outcomes.
- **This** gate is full-scan, in CI and everywhere else: `npx qfai validate --profile verify --fail-on error`, or the default `npx qfai validate --fail-on error`. A partial profile does not satisfy it, and no waiver or environment makes it satisfy it. That is a statement about the verification gate, not a ban on narrow profiles in CI: `qfai-discussion`, `qfai-prototyping` and `qfai-atdd` each define a narrow profile as their own stage gate, those runs are legitimate under `CI=true`, and `QFAI-VALIDATE-017` (`warning`) marks them as not-full-scan rather than blocking them. The prototyping carve-out below is a local, pre-`certify` run.
- Waivers are only for `warning` / `info` findings. If a waiver attempts to suppress an `error`, treat it as a failure and fix the root cause.
- A waiver's `rule:` is the finding's `code` — `issues[].code` in `.qfai/report/validate.json` (the array is `issues`, not `findings`; keys are documented in `references/validate-json-schema.md`) — copied verbatim — `QFAI-ATDD-112`, `TDDLIST_UNKNOWN_LEVEL`, `E_TC_ORPHAN`. Do not strip the `QFAI-` prefix; the stripped form is a back-compat alias only.
- You MUST stop and escalate if any gate fails without an actionable fix list.
- Completion must be approved by a reviewer who did not run the gates.

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check** (this skill's override): the mandatory gate set below, run to completion, with every outcome written to `.qfai/output/verify.json` — a gate with no discoverable command is UNRUN, not a pass.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Goal

Run quality gates and produce evidence that the change is correct and safe.

## Success Criteria (Definition of Done)

- Repo quality gates PASS (format/lint/type/test/build/etc).
- QFAI checks PASS (at minimum: `npx qfai validate --profile verify`, or `--profile prototyping` for a `scope: "prototyping"` run; optionally `npx qfai report`).
- Declared screens have mandatory screenshot and HTML evidence.
- A concise evidence summary exists (copy‑paste for PR).
- The PR-ready summary includes **Change Classification (Primary/Tags)** per `.qfai/assistant/constitution/change-classification.md`.
- Evidence file exists: `.qfai/evidence/verify-<spec-id>.md`.
- Verdict file exists: `.qfai/report/verify.json`, with `status` and `scope` set per "Verify Output Contract".
- Completion is approved by a reviewer who did not run the gates.

## Mandatory checks

- Run listed commands and record outputs.
- If failing, produce an actionable fix list (not vague).
- Static policy checks:
  - `.qfai/assistant/constitution/drift-protocol.md` exists.
  - `.qfai/assistant/catalog/test-layers.md` exists.
  - all `.qfai/assistant/skills/*/SKILL.md` include `[DRIFT-PROTOCOL:MANDATORY]`.
  - reviewer-related agent docs include drift-protocol and test-layer review viewpoints.

## Not-done criteria

- "Seems ok" without actual command outputs.

## Non‑Negotiable Principles (QFAI Articles)

Seven articles bind every run: spec is authoritative over code, traceability is
mandatory, evidence beats confidence, scope stays minimal but gaps stay visible,
outputs are runnable, and only truly blocking questions reach the user.

Quality gates are the decision mechanism — tests, lint, typecheck, build and
pack verification, whatever the repo defines. Fix until PASS.

The articles are stated in full, with what each one forbids, in
`references/articles.md`.

## README Rule

Do not create `.qfai/**/README.md` files as scaffold or format documentation; keep artifact guidance in skill references/templates.

- READMEs are reference guides. Follow their structure, templates, and checklists.

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

- If the user writes in Japanese, output Japanese.
- If the user writes in English, output English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.  
  This rule overrides all other stylistic preferences.

## Multi‑Role Orchestration (Subagents)

Use the platform's native sub-agent delegation mechanism for Claude Code, GitHub Copilot, and Codex.

### Delegation order

Use `.qfai/assistant/manifest/agent-routing.yml` as the routing SSOT.

- First required delegation / Capability Probe: `delivery-planner` in the `plan` phase.
- Then follow routed phases in order: `plan` (`delivery-planner`, `qa-strategist`) -> `execution` (`devops-ci-engineer`) -> `review` (`qa-gatekeeper`, `completion-reviewer`, optional `implementation-reviewer` when code fixes are in scope).
- Do not prepend non-routed roles before the first required delegation attempt.

### Delegation contract (tool-neutral)

```text
Role: delivery-planner
Task title: Create an execution plan and DoD
Goal: sequence quality gates and evidence work
Inputs:
- current change context
- required gates
Constraints:
- evidence-first
- no self-approval
Return:
- phases + risks + DoD
```

### Failure rule

- The first required delegation attempt doubles as the capability check.
- If that delegation fails, stop immediately. Do not simulate roles or continue with self-execution.

## Completion Separation (mandatory)

- Gate execution (`devops-ci-engineer`) and completion approval (`completion-reviewer`) must be separate.
- `qa-gatekeeper` must confirm gate coverage before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Gates already executed vs remaining
- Evidence captured so far and what is missing

## Step 0 — Load Context (always)

Read the project steering, the constitution, the artifacts for the current work
item, and the repo's own conventions before anything else. The file-by-file
reading list is in `references/context-load.md`.

Do not use discussion-pack artifacts as verification inputs. Verify reads
normalized specs, contracts, and evidence only.

## Step 0 — Project Analysis (mandatory)

Before producing any deliverable, thoroughly analyze the current project (background/goals, directory structure, runtime/tooling versions, architecture boundaries, existing test/doc/CI patterns) so your outputs fit the repo.

### Minimum analysis checklist

- [ ] Read key repo docs: README / CHANGELOG / RELEASE (if present)
- [ ] Inspect `.qfai/` layout and existing SDD/ATDD/TDD artifacts (if present)
- [ ] Inspect the project's own source tree (entrypoints, core modules, validators, packaged assets)
- [ ] Identify standard gate commands (format/lint/type/test/verify-pack) and where they are defined
- [ ] Note constraints: Node versions, CI matrix, packaging rules, verify-pack expectations

If analysis cannot be performed, clearly state what could not be verified and proceed with minimal-risk assumptions.

## Step 0.5 — Steering Bootstrap / Refresh (mandatory when incomplete)

QFAI expects `assistant/catalog/` to contain **project‑specific facts** so all subsequent design/test/implementation fits this repository.

### What to do

1. Open these files:

- `.qfai/assistant/catalog/product.md`
- `.qfai/assistant/catalog/tech.md`
- `.qfai/assistant/catalog/structure.md`

1. If they are missing, mostly empty, or still have placeholders (e.g., a lone `-`
   only), **populate them by analyzing the current repository**:

- derive “what/why/users/success/non-goals” from README/docs/issues (product.md)
- derive runtime/tooling versions + constraints + standard gate commands from the task-runner manifest (`package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`, …), then CI config, then lockfiles — same order as `.qfai/assistant/constitution/quality.md` (tech.md#standard-commands-copy-paste)
- derive repo layout + key directories from the file tree and scripts (structure.md)

1. Do **not** invent facts. If something cannot be verified, write it as:

- `TBD` + what evidence is missing, or
- an Open Question (if it blocks correctness)

### Steering refresh checklist

- [ ] product.md: what we build / users / success / non-goals / release posture
- [ ] tech.md: Node / package manager / TS / test / lint / CI constraints, plus the standard gate commands under `tech.md#standard-commands-copy-paste` — the section `/qfai-implement` reads
- [ ] structure.md: repo layout, key packages, entrypoints, how to run locally (setup + launcher only — gate commands stay in tech.md)

## Step 1 — Discover project gate commands (DevOps/CI Engineer)

Prefer existing scripts, in this order:

- task-runner manifest: `package.json` scripts, `Makefile`, `justfile`,
  `pyproject.toml`, `Cargo.toml`, …
- CI config
- the project's own contributing docs

Write what you discover back into
`.qfai/assistant/catalog/tech.md#standard-commands-copy-paste` — that is the
section `/qfai-implement` reads, and a capability left without an entry there is
UNRUN. If unknown, propose defaults and mark assumptions.

## Step 2 — Run QFAI gates

Run (adjust as needed):

- `npx qfai validate --profile verify --fail-on error` — or `npx qfai validate --profile prototyping --fail-on error` when this run's scope is `prototyping`
- `npx qfai report` (if used in this repo)

Notes:

- CI must run default/full validation only. Partial profiles are local skill checks only. The `prototyping` scope is the one exception, and it is a stage carve-out rather than a shortcut — see "Verify Scope Rule".
- If `QFAI-WAIVER-002` appears, remove the invalid waiver and resolve the underlying `error` finding.

Capture:

- exit codes
- key errors/warnings
- file paths affected

## Step 3 — Run repo gates

Run the repo’s standard pipeline in a stable order:

1. format
2. lint
3. typecheck
4. unit tests
5. scenario/e2e tests
6. build/package (if relevant)

## Step 4 — Fix loop (Code Reviewer + QA)

If anything fails:

- Identify whether it’s spec mismatch, test issue, or implementation defect.
- Fix the root cause (do not silence tests without reason).

## Step 5 — Produce Evidence Summary (Delivery Planner)

Output this format:

### Verification Evidence

- Change classification (SSOT: `.qfai/assistant/constitution/change-classification.md`):
  - Primary:
  - Tags:
  - rationale (1-3 lines):

- QFAI:
  - command:
  - result:
- Repo gates:
  - command:
  - result:
- Notes:
  - assumptions:
  - risks:

## Evidence (MANDATORY)

Create and update `.qfai/evidence/verify-<spec-id>.md`. Evidence must include:

- command list + pass/fail + next actions

Never a status-only claim.

The required section list and the copy/paste skeleton are in
`templates/verify-evidence.md`. Every section is required; "none" with a
justification is an acceptable value, deleting the heading is not.

## Completion Criteria (Final Gate)

**All of the following must be verified and PASS:**

1. QFAI validation:

   ```bash
   npx qfai validate --profile verify --fail-on error
   ```

   For a `scope: "prototyping"` run, this gate is
   `npx qfai validate --profile prototyping --fail-on error` instead. The `verify`
   profile is not achievable before `/qfai-atdd` has run — see the prototyping
   carve-out in "Verify Scope Rule".

2. Repository standard gates (discover from package.json/CI/docs):
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)

   Record the exact commands and results.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Output

- `.qfai/report/verify.json` — the machine-readable verdict (`status` + `scope`), per "Verify Output Contract". Downstream gates read this file.
- `.qfai/evidence/verify-<spec-id>.md` — the human-readable evidence summary with all gate results
- All gates: PASS confirmed
- Next action suggestion: proceed to PR creation (use your platform workflow), or — for a `scope: "prototyping"` run — proceed to `npx qfai prototyping certify`

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions/steering and the 09_delta.md spec-id
- DR-IDs referenced (or "none" + propose adding a Decision Record)
- Confirmation that no rejected options were reintroduced (or list RE-OPEN DR-IDs)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not run the gates.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions that place a **new obligation on the product** were routed to the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations`; questions about this skill's own inputs or settings stay in its own output for the user to answer. This skill does not write `08_Open-questions.md`.
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): Create a PR on your hosting platform.
  Action: use the verified evidence to write the PR description.
- Any gate failed:
  Action: return to the owning skill, fix the issue, then rerun `/qfai-verify`.
- Need a report artifact:
  Action: run `npx qfai report` after validation outputs are up to date.

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

- Verify is the full-scan approval gate; per-skill validate runs (sdd/atdd/tdd) are signals, the verify gate is the binding pass.
- Completion requires zero errors across every profile in the declared scope AND zero leakage in the distributed-surface guard AND a clean branch version pin. A `scope: "prototyping"` run's scope is the `prototyping` profile only; stage-5 obligations (QFAI-ATDD-111/112/113) belong to the later `atdd` / `full` run.
- Verify never rewrites artifacts; it only reads and reports. Drift fixes belong to /qfai-sdd / /qfai-implement / /qfai-atdd respectively.
