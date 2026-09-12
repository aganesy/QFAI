---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Implement automated acceptance tests (E2E/API/Integration) aligned with US/TC/CON-API/CON-DB obligations from specs and contracts."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, Edit, TodoWrite, Task, Agent, Bash]
roles:
  - orchestrator
  - delivery-planner
  - test-design-analyst
  - qa-strategist
  - acceptance-test-engineer
  - devops-ci-engineer
  - completion-reviewer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
mode: execution-focused
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-atdd — Implement Automated Acceptance Tests (ATDD)

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- test scope decisions
- runtime environment confirmation

## FORMAT SSOT (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#format-ssot-mandatory`.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`, and `.qfai/assistant/skills/qfai-grilling/SKILL.md` before the preflight round (see Grilling)
- P2: `.qfai/assistant/manifest/agent-routing.yml` + `.qfai/assistant/manifest/review-profiles.yml` + `.qfai/assistant/catalog/*`; from `.qfai/assistant/manifest/agent-catalog.yml` read the acting `orchestrator`'s and each routed role's entry (`owned_artifacts` / `tool_profile` / `permission_profile` / `specialization_tags`), not the whole file — its `developer_instructions` bodies mirror the agent cards (`.qfai/assistant/constitution/constitution.md` Article III)
- P3: `.qfai/specs/<spec-id>/01_Spec.md` (Primary SSOT / Consumer View). **Read its lifecycle before anything else and stop on a retired spec.** A spec is retired by a **complete** declaration in that header block: a top-level `Status: superseded` whose `Superseded-by:` names a spec that exists and itself declares `Status: active`, or `Status: deprecated` / `Status: removed` with a `Deprecated-at:` that is a real calendar date — the same resolution `validate` performs. Its `test-list.md` rows below are history, not obligations: `npx qfai validate` and `npx qfai report` have already dropped them, and `/qfai-implement` refuses the handoff for a retired spec, so writing acceptance tests from them produces work nobody owes and a handoff nobody will take. Report the declared `Status:` (and, for `superseded`, its successor) and ask for a row in the inheritor's ledger instead. An **incomplete** declaration is not a retirement and does not stop this run: the ledger still gates, so proceed and report the incomplete declaration
- P4: specs/contracts obligations
  - `.qfai/specs/<spec-id>/02_User-stories.md` (US)
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md` (AC)
  - `.qfai/specs/<spec-id>/05_Examples.md` (EX)
  - `.qfai/specs/<spec-id>/06_Test-Cases.md` (TC)
  - `.qfai/specs/<spec-id>/tdd/test-list.md` (the execution ledger — enumerate the `Layer = E2E` / `Layer = API` / `Layer = Integration` rows this run owes evidence for, with their `TDD-ID`, obligation column and `Selector`; an `Integration` row whose `TC-Refs` name only `L1` / `L2` TCs is outside the ATDD-owned set and is not enumerated — `## Execution Ledger: the rows this skill feeds`)
  - `.qfai/contracts/api/**` (CON-API) and `.qfai/contracts/db/**` (CON-DB)
  - `.qfai/contracts/ui/**` and `.qfai/contracts/design/**` when the target spec is UI-bearing
  - `qfai.config.yaml` — resolve `paths.specsDir` / `paths.contractsDir` **first** (`.qfai/specs` / `.qfai/contracts` are only the defaults; the resolver scans the configured trees, so an override moves every path in this bullet), then `prototyping.primarySpecId`, **every** `<contractsDir>/ui/**` (`.qfai/contracts/ui/**` by default) file as its **path relative to `<contractsDir>/ui/`, not its basename** (a surface declared only as `spec-<spec-id>/screens/home.yaml` is matched on its `spec-<spec-id>/` ancestor directory; the basename carries no spec id), and every sibling `<specsDir>/*/01_Spec.md` frontmatter **and body — the legacy `# … prototyping …` heading counts as the same opt-in**, so a heading-only sibling flips it too — always, even for a spec with no surface of its own: the `US-*` narrowing is the project-wide opt-in above, so a sibling's declaration alone decides whether this spec owes E2E references
- P5: `.qfai/specs/<spec-id>/07_Decisions.md` + `.qfai/specs/_policies/08_Decisions.md` (Decision Records, `DR-*`; if no spec yet, state "not applicable")
- P6: legacy artifacts (optional only)
  - `.qfai/specs/<spec-id>/scenario.feature`
  - coverage ledger files

Do not read discussion-pack UI/UX sidecars. UI-bearing acceptance tests consume only specs and contracts normalized by `/qfai-sdd`.

## Grilling

Article IX's preflight session runs here. This section carries what is local to
this stage — the session's subject, what reopens it, and where the record goes.
The method is `.qfai/assistant/skills/qfai-grilling/SKILL.md`, read before the
session and followed as written; `.agents/rules/grilling.md` is the rule it
implements. Neither is restated here, and a stage-local copy of either would
give an execution run one instruction and the primitive another.

- **A session, not a round.** Rounds run until the frontier is empty, because a
  round is only what is answerable now: stopping after the first one and editing
  code leaves every decision that depended on those answers taken silently. The
  tree is usually small enough that one round empties it, which is what makes
  the session affordable every time — not a licence to stop there.
- **Subject: this invocation.** The tree holds the decisions this run is about to
  take — what a case's oracle must observe, what a fixture has to
  construct for it, and which of several admissible shapes a test takes. **Not
  the layer**: an obligation's home is routed deterministically from its `Level`,
  including every unreadable spelling, and a grilling answer that moved one would
  put the test where the coverage contract does not look. It does not hold the spec, the acceptance criteria or the
  ledger rows: those are settled input, and re-interviewing them each pass
  reopens what somebody already decided.
- **Reopen on a contradiction, and hand the answer to the Drift Protocol.**
  An acceptance criterion no test can reach as written, or
  an obligation whose `Level` names a home the behaviour cannot be observed
  from. Open a session over **what the change should ask for**, never over
  whether to make it. `.qfai/assistant/constitution/drift-protocol.md` carries
  the change — STOP, Change Request, the user's approval, the owner rerun — and a
  session is not a second route to editing settled input.
- **Record every session where the gate reads it.** The method writes no
  artifact of its own, so a run that grilled and a run that skipped it leave the
  same tree. `.qfai/evidence/atdd-<spec-id>.md` carries a `## Grilling Session` section holding **one
  row per session** — the preflight one, and any a contradiction reopened:

  ```text
  | Ended | Ended at | Revision | Before | Decisions | Open | Escalated |
  | ----- | -------- | -------- | ------ | --------- | ---- | --------- |
  | confirmed | 2026-01-01T09:14:00Z | a1b2c3d | first write | 4 | 0 | 0 |
  | user-closed | 2026-01-01T11:02:00Z | a1b2c3d | CR-20260101-0001 | 2 | 1 | 0 |
  ```

  `Ended` takes one of the endings the method defines: `confirmed`,
  `user-closed`, `no-question` or `stopped`. `Revision` is the tree the session
  ended against, and the gate requires it to be **this** run's — an evidence file
  is updated in place, so a row left by an earlier invocation would otherwise let
  a later run skip the session entirely. `Before` says what the session preceded:
  `first write` for the preflight one, and the Change Request or the edit that
  surfaced the contradiction for a reopened one.

- **The open questions go under that table, in the same section.** One line per
  decision left open, carrying the decision, the labelled assumption written in
  its place where a document required a value, and nothing else. That is the
  register this stage's gate reads, and it is here so a reader finds the count
  and the questions it counts in one place.

## Read Set Contract (Mandatory)

- Default Mode:
  - `.qfai/specs/<spec-id>/01_Spec.md`
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
  - `.qfai/specs/<spec-id>/05_Examples.md`
  - `.qfai/specs/<spec-id>/06_Test-Cases.md`
  - `qfai.config.yaml` (`paths.specsDir` / `paths.contractsDir` first — `.qfai/specs` / `.qfai/contracts` are defaults an override replaces, and the two scans below follow the configured trees), then `<contractsDir>/ui/**` (`.qfai/contracts/ui/**` by default), keeping each hit's path relative to `<contractsDir>/ui/`, not just the basename — a `spec-<spec-id>/` ancestor directory is itself a match signal, so a basename-only reading drops it — and every sibling `<specsDir>/*/01_Spec.md` frontmatter **and body**, the legacy `# … prototyping …` heading being an equal opt-in signal — the project-wide surface opt-in that decides this spec's `US-*` obligation. Resolve it **before** the Test Volume Estimate; leaving it to the closing `npx qfai validate` turns a known row count into a late `QFAI-ATDD-111`.
  - `.qfai/specs/<spec-id>/tdd/test-list.md` — read, never written. A seeded row's `Test file` and `Selector` are still `-` there, because Phase 2b seeds them before any test exists: record the path and selector of the test **this run authored** as the handoff entry's row identity rather than copying that placeholder, since this stage is where they first exist and `/qfai-implement` Phase Red step 3b is the step that writes them into the ledger. A run that does not enumerate its `Layer = E2E` / `Layer = API` / `Layer = Integration` rows produces no `## Ledger rows advanced` entry for them, and `/qfai-implement` Phase Red step 3b then stops on a missing handoff. The carved-out `Integration` row — `TC-Refs` naming only `L1` / `L2` TCs — is the exception at both ends: it is not enumerated here and step 3b never receives it, because `/qfai-implement` writes its test itself (`## Execution Ledger: the rows this skill feeds`).
  - `.qfai/contracts/api/**` (`CON-API`) and `.qfai/contracts/db/**` (`CON-DB`) — what `QFAI-ATDD-113` / `QFAI-ATDD-115` grade this stage on. Both are attributed to `.qfai/contracts/**` and survive `--spec`, so a run that never opens them cannot know which contracts it owes, and cannot reach the `-- x-qfai-status: planned` deferral either.
- Escalation Mode:
  - allowed only when `01_Spec.md` Escalation Hook signals ambiguity / conflict / missing constraint / trade-off
  - read only `.qfai/specs/_policies/01_Objective.md` and `.qfai/specs/_policies/08_Decisions.md`
- Default Mode is a floor, not a closed set — Inputs Priority P4 governs what else this stage may open — but do not read `_policies/**` by default.
- Do not read `_policies/**` by default. **One narrow exception**, and only when the scoped gate exits 1 on a residual `QFAI-ATDD-113` / `-115` — whether it is a sibling's, this spec's own or an orphan's is what this read _decides_, so the exception fires on the unresolved finding, not on an ownership you cannot yet have: the `Owning spec` field cannot be filled from the finding, so read the generated Contract → Spec map (`npx qfai report --in` the scoped gate's `validate.spec-<id>.json`, whose path is derived from `output.validateJsonPath` and not from `paths.outDir`; never `--run-validate`, which re-runs the full profile unscoped and advances every spec's scaffold-placeholder counters) **and** merge into it the `Contract-Refs` column of `.qfai/specs/*/04_Business-Rules.md` — always, not only when the map answers `(none)`, since the map misses specs that bind a contract in the rule table alone, and misses the ones that write the short `API-NNNN` / `DB-NNNN` form its keys never match — that column only, nothing written back (`references/cross-spec-obligations.md#resolving-the-owning-spec`).

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- Follow the shared baseline.
- Orchestrator MUST NOT self-approve.
- Orchestrator MUST NOT generate the primary artifact first draft.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

## Work Orders Summary

Use the shared schema.

### Stage Minimum Roles (MUST)

- Delegate: `test-design-analyst` defines coverage and layer ownership.
- Delegate: `acceptance-test-engineer` implements E2E, API, and integration acceptance tests.
- Delegate: `devops-ci-engineer` captures execution evidence when CI/runtime proof is needed.
- Integrate: `orchestrator` consolidates delegated outputs and presents results.
- Gate: `completion-reviewer` is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-gate-baseline`.
- The stage evidence's `## Grilling Session` section carries a row for the
  preflight session and one for every session detection opened; every `Ended` is
  one of the four endings the rule master names; every `Work resumed` is later
  than its own `Ended at` and inside this run; and each row's `Open` count
  matches the questions listed under the table. A run that skipped a session
  leaves the same tree as one that ran it, and an evidence file is updated in
  place, so the rows are what tell a fresh session from an absent one and from
  last week's.
- **A `no-question` row with a non-zero `Open` is a `REVISE`.** Article X, rule 6
  says the stage cannot complete over a decision nobody took, and nobody was
  asked. A `user-closed` row with open decisions **passes**: the user saw them
  and closed the asking, and the method records each as a labelled assumption.
  A `stopped` row is a `REVISE` whatever it counts — the user ended the session,
  so the stage reports every open decision rather than proceeding.
- Final completion gate MUST be delegated to an independent `completion-reviewer`.
- ATDD-specific reviewer checks:
  - coverage obligations met: E2E covers `US`, API covers `CON-API`, Integration covers every declared `CON-DB` (`QFAI-ATDD-115`) — a contract **this spec owns** but outside the current slice deferred with `-- x-qfai-status: planned` on a line of its own, never silently uncovered — and every `TC` **whose `Level` routes to an ATDD home** — `L3`/`L4`/`L5`, no `Level`, an unreadable spelling, or `system` / `acceptance` — is covered from the directory that `Level` routes to. A **sibling spec's** uncovered `CON-DB` is not that case, and the reviewer must not ask for that edit: `QFAI-ATDD-115` is filed against `.qfai/contracts/**` and survives `--spec`, so it reaches this gate without becoming this run's work — record it as a cross-spec obligation and leave the contract file alone (CRITICAL CONSTRAINTS), because marking it `planned` defers the owning spec's DB test and hides a real gap. `L1`/`Unit` and `L2`/`Component` owe nothing here (CRITICAL CONSTRAINTS): the ledger covers them. An existing L1/L2 annotation in `tests/integration/**` is not a violation — the validator declines to count it and declines to flag it — so do not require one to be added, and do not require an existing one to be removed;
  - Coverage Depth Matrix and its business rule coverage table are reviewed and no unjustified `❌` cells remain in either; that table is reconciled against the spec's `04_Business-Rules.md`, which the reviewer work order MUST carry as an input — every active `BR-ID` it declares owns a row, whether the declaration is a Rule Table row or a `BR-*` heading carrying no retiring `Status:`, and a table of only `✅` rows that drops a declared rule is a REVISE, not a PASS (a spec declaring no active `BR-*` states the omission instead of carrying the table);
  - validation evidence exists and `npx qfai validate --profile atdd --fail-on error --spec <spec-id>` reached one of its **two** passing states — exit 0, or `PASS with cross-spec obligations`: every finding this spec owns is clean, and each residual `QFAI-ATDD-113` / `-115` / `QFAI-TEST-001` is recorded one row per obligation under `## Cross-spec obligations` with a named sibling owner — a contract per row for the first two, a stub file per row for the third. Exit 1 alone is not `REVISE` here; residue that is unrecorded, unattributable, or attributed to this spec is (`references/cross-spec-obligations.md`);
  - Drift Protocol is enforced;
  - test-layer policy is checked against `.qfai/assistant/catalog/test-layers.md`;
  - coverage floors and ratios are signals, not gates;
  - `scenario.feature` and coverage ledgers remain optional legacy inputs, not completion gates.
- Route specialist reviewers from `.qfai/assistant/manifest/agent-routing.yml`.
- Default ATDD review set:
  - `completion-reviewer`
  - `qa-gatekeeper`
- Add `implementation-reviewer` only when helper/runtime support code changed.
- Do not declare DONE until all routed blocking reviewers return `PASS`.

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
- **Neither session changes settled input.** Where one concludes that settled
  input must change, `.qfai/assistant/constitution/drift-protocol.md` governs:
  stop the dependent work, raise the Change Request, wait for approval. Where it
  concludes the obstacle is this run's to solve, the run solves it — nothing
  upstream changes, so there is nothing to approve.
- **Record both sessions where the gate reads them.** The method writes no
  artifact of its own, so a run that grilled and a run that skipped it leave the
  same tree. `.qfai/evidence/atdd-<spec-id>.md` carries a `## Grilling Session`
  section holding one row per session:

  ```text
  | Ended | Ended at | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
  | ----- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
  | confirmed | 2026-01-01T09:14:00Z | 2026-01-01T09:15:20Z | preflight | empty | none in flight | 4 | 0 | 0 |
  | user-closed | 2026-01-01T11:02:00Z | 2026-01-01T11:04:10Z | an acceptance criterion the spec does not cover | empty | none in flight | 2 | 1 | 0 |
  ```

  The shape `/qfai-discussion` already writes, with `Subject` in place of that
  stage's lone `Authoring began`: this stage holds more than one session, so a
  row says which. `Work resumed` is when the stage next wrote — the first acceptance test for the preflight session,
  the first edit made after a detected one.

  **Both times, and the second later than the first.** A row holding only the
  ending reads the same whether the session ran before the work or after it,
  because it is written at the end either way. What the pair records is the
  order, which is the part a later reader has no other way to recover. It still
  cannot prove a session happened: the agent writes its own record.

  `Ended` is `confirmed`, `user-closed`, `no-question` or `stopped` — the four
  endings `.agents/rules/grilling.md` names — and only the first three let the
  work go on.

- **The open questions go under that table, in the same section.** One line per
  decision left open, carrying the decision and the labelled assumption written
  in its place where a document required a value. That is the register this
  stage's gate reads, and it is here so a reader finds the count and the
  questions it counts in one place.

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion based on unit/component tests.
- `10_Plan.md` is the primary How SSOT for execution phases.
- If `10_Plan.md` is missing, stop and run owner planning flow before proceeding.
- Completion gate is validation with zero errors **for this spec**: `npx qfai validate --profile atdd --fail-on error --spec <spec-id>`. The scope flag is not optional bookkeeping. This skill runs one spec per invocation, and unscoped it reports every other spec's `QFAI-ATDD-111` / `-112` obligations — findings this run cannot act on and must not be blocked by. A `--spec` run also writes `<report>/validate.spec-<id>.json` rather than the shared `validate.json`, so the JSON gate artifact is per spec, and an unknown or unparseable value fails the run (`QFAI-SCOPE-001` / `QFAI-SCOPE-002`) instead of silently widening back to the whole repository. **That is not the same as being parallel-safe.** `<report>/validate.log` and the run-log pointer are shared by every run, scoped or not, and nothing serializes them — so two stages running at once can leave that pointer naming the other one's run. Cite the per-run `<report>/run-*/` directory, or this spec's `validate.spec-<id>.json`, as the Validate Hard Gate evidence; do not cite `validate.log` from a run you shared with another stage.
- **`--spec` scopes the spec-owned rules only, and the gate still fails on the rest.** Every rule whose finding names a spec is scoped: `QFAI-ATDD-111` (US) and `QFAI-ATDD-112` (TC) by the specs they name, `QFAI-ATDD-101` / `-102` by the spec in the unknown token, `QFAI-ATDD-121` / `-122` / `-123` by the specs whose TCs are misplaced, and `D-SCAFFOLD-PLACEHOLDER` by the spec its skeleton belongs to. A scoped run reports all of those for the requested spec and drops a sibling's. What cannot be scoped **does** fail a scoped gate — `QFAI-ATDD-113` (`CON-API`) and `QFAI-ATDD-115` (`CON-DB`), attributed to `.qfai/contracts/**`, which has no spec owner in the model, and the repo-level cases beside them: `references/cross-spec-obligations.md#what-the-scope-flag-cannot-narrow` enumerates all of them.

  So a sibling spec's uncovered contract exits 1 on this spec's gate. That is a real limit, not a formality. When it happens: record the finding, its owning spec and why it is not this stage's work as a cross-spec obligation in this stage's evidence, under `## Cross-spec obligations`, and say so in the completion report — do **not** claim the gate passed, weaken the profile, lower `--fail-on`, or waive it. Closing them is the owning spec's next `/qfai-atdd` run. The repo-wide run belongs to `/qfai-verify`, at the end of the stage. **That record is a terminal state, not a deferral of one**: a run whose every residual finding is attributed to a named sibling spec completes as **`PASS with cross-spec obligations`** (`#success-criteria-definition-of-done`), and the repo-wide `/qfai-verify` run settles the residue. Unnamed, that state is unreachable — the owning spec's run hits this same block from the other side, so every spec waits for every other one and the four moves just forbidden are the only exits left. It is not free: a finding you cannot attribute to a named sibling spec is **this** spec's, and it fails.

- Coverage obligations are mandatory : , and **`required` narrows on a different mechanism for each ID kind — `US-*` by surface type, `TC-*` by its declared `Level`, `CON-API-*` by active-vs-deferred. They share a word, not a rule; never carry one kind's over to another**:
  - `tests/e2e/**` must cover all required `US-*`. A story outside the current slice is deferred in `02_User-stories.md` with a `- x-qfai-status: planned` meta line in its own `US-XXXX` block (a `##`-or-deeper heading, or its catalog list entry) — the same token both contract kinds use — and is named at `info` by `QFAI-ATDD-118`. It is not left uncovered, and it is not covered by a test that asserts nothing. `exception` is not the alternative here: that branch belongs to a ledger row, and a `US-*` owns none (`references/red-provenance.md#a-spec-with-no-atdd-owned-rows`). **Required** here = every declared `US-*` of a **user-facing** spec, "user-facing" being the same surface union `/qfai-prototyping` resolves — frontmatter `surface_type: ui-bearing` in `01_Spec.md`, a matching UI contract in `.qfai/contracts/ui/` (the resolver accepts these names and no others: `<spec-id>.yaml`, `spec-<spec-id>.yaml`, `ui-<spec-id>.yaml`, `ui-<spec-id>-<slug>.yaml`, or any `*.yaml` at any depth under a `spec-<spec-id>/` subdirectory — a basename that merely contains the id, such as `0002-orders.yaml`, is not one, and a `.yml` extension never is), a legacy `# … prototyping …` heading, or the spec pinned by `qfai.config.yaml#prototyping.primarySpecId`; any one signal is enough. **That narrowing is a project-wide, all-or-nothing opt-in**: it turns on the moment any one spec in the repository declares a user-facing surface, and until then it is off repo-wide. So a spec with no user-facing surface owes no E2E reference once the project has opted in, and before that owes one for every declared `US-*` — the obligation on the spec in front of you can change because a **different** spec added a surface declaration, with nothing in this stage's inputs to show it. On a resolution failure `qfai` names the reason on stderr and keeps the obligation project-wide, so read stderr before treating an unexpectedly wide `QFAI-ATDD-111` as a spec error (`catalog/test-layers.md#atdd-annotation-hard-gate`).
  - Every `TC-*` must be covered from the directory its declared `Level` routes
    to: `L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
    `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`. Every other `Level` routes to
    `tests/integration/**` — blank, a spelling that names no layer, and `system` / `acceptance`. Route by the annotation's destination, not by whether the word is familiar: those last two are in the layer vocabulary, so a list phrased the other way drops them (`references/red-provenance.md`).
  - **`L1`/`Unit` and `L2`/`Component` owe nothing here** — out of this skill's
    scope, excluded from `QFAI-ATDD-112`, gated by `tdd/test-list.md` under
    `/qfai-implement`, and named on every run by `QFAI-ATDD-117` (`info`). Do
    not duplicate an L1/L2 annotation into `tests/integration/**` to quiet a
    gate: that is the all-integration collapse `catalog/test-layers.md` lists as
    an anti-pattern.
  - `tests/api/**` must cover all required `CON-API-*`. **An ID carried by a file that declares no test is not coverage**: the scan reads markdown too, and a `.test.ts` holding only the annotation is the same ledger renamed. `QFAI-ATDD-119` (`info`) names them, and coverage is `missing` **and** `coveredByCarrierOnly` in `summary.json`, never `missing` alone. This skill runs one spec, so gate on the narrowed `QFAI-ATDD-119` in `<report>/validate.spec-<id>.json`: `summary.json` stays repo-wide under every scope, and a sibling spec's placeholder would keep its arrays non-empty forever. **Required** here = every **active** declared `CON-API-*` **id** — the unit is the `QFAI-CONTRACT-ID` a contract file declares (one per file; a second is `QFAI-CONTRACT-011`), **never the OpenAPI operation**: one annotation covers that id however many operations the document describes, so counting per operation overstates both the estimate and the DoD. An id deferred with `x-qfai-status: planned` is declared but not owed. **That marker is read as a top-level key of the contract document — or, when the document does not parse or declares no such top-level key, as a column-0 comment (`# x-qfai-status: planned`, unindented; the comment form is accepted precisely because column 0 cannot be an operation-level key) — and either form defers the whole file**, i.e. the id that file declares. Written under an OpenAPI operation, commented or not, it is ignored: the contract stays active and `QFAI-ATDD-113` fires for its uncovered id, so slice a partially-planned contract into its own file (with its own id) rather than marking the operation. Surface typing does not touch this obligation.
  - `tests/integration/**` must cover all required `CON-DB-*` (`QFAI-ATDD-115`). **Required** here = every **active** declared `CON-DB-*` id — a contract this spec owns but outside the current slice is deferred with `-- x-qfai-status: planned` **on a line of its own** — leading whitespace is allowed, trailing SQL is not, so a marker appended after a statement leaves the contract active — and the marker defers the whole file it sits in. Never left uncovered. The rule is repo-attributed like `QFAI-ATDD-113`, so it survives `--spec`: a **sibling's** uncovered contract is recorded as a cross-spec obligation, not marked `planned`.
- Forbidden references (a TC annotation outside its declared home):
  `tests/api/**` and `tests/e2e/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY`
  unless that TC declares `Level` `L4`/`API` or `L5`/`E2E` respectively.
- Unknown references (`US/TC/CON-API/CON-DB` not declared) must be treated as errors.
- **The E2E/API ledger rows this stage feeds are bound by `/qfai-implement`'s lifecycle.** See "Execution Ledger" below: a row advanced on none of the three RED-provenance forms is a lifecycle violation.
- Floors/ratios are planning signals only, not gates.
- Legacy `scenario.feature` or coverage ledgers may exist but are not mandatory inputs for completion.
- The per-item evidence file `.qfai/evidence/atdd-<spec-id>.md` is required and
  committed. Ledger `Evidence` cells point to its anchors, and validation must
  resolve them on a fresh clone. The managed `.gitignore` block re-includes it,
  alongside `.qfai/evidence/implement-<spec-id>.md`. **Governance records also
  stay in version control**: Change Requests (`.qfai/decisions/CR-*.md`),
  durable decision records (`.qfai/evidence/decisions/*.json`), the **Coverage
  Depth Matrix** (`.qfai/evidence/coverage-depth-<spec-id>.md`) and **this
  stage's own `.qfai/evidence/atdd-<spec-id>.md`**, whose RED provenance is taken
  before the passing code exists and so cannot be regenerated. A negation does
  not stage a file — commit it
  (`.qfai/assistant/constitution/drift-protocol.md#which-evidence-is-committed`).
- **The matrix is a governance record, not a log**, so it is committed:
  `.qfai/evidence/coverage-depth-<spec-id>.md`, one justification per `❌`
  (`references/test-case-depth-checklist.md#where-the-matrix-lives`).

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check** (this skill's override): the acceptance tests **this run created or changed** — every `tests/e2e/**`, `tests/api/**` and `tests/integration/**` file you wrote or edited, filled-in scaffolds among them — executed with the runner from `catalog/tech.md#standard-commands-copy-paste`, reaching a red/green verdict rather than a collection or import error. Not "the tests you just scaffolded": `scaffold` emits the Integration-owned `TC`s only, so an E2E/API-only run has no scaffold output at all and would have had nothing to execute. A run that wrote no test file still has a target — a spec whose obligations were already satisfied and only re-verified — and it is the spec's existing acceptance suite: the files carrying this spec's `US` / `TC` / `CON-API` / `CON-DB` annotations, in the directories those obligations route to, run the same way. A spec whose integration work is contract-driven has `QFAI:CON-DB-*` and no `TC-*` in `tests/integration/**`, and a selection stopping at `CON-API` runs none of it. A run that never reached the assertions is UNRUN, not a pass.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Goal

Turn specs/contracts obligations (`US` / `TC` / `CON-API` / `CON-DB`) into runnable acceptance tests in this repository.

## Execution Ledger: the rows this skill feeds

`.qfai/specs/<spec-id>/tdd/test-list.md` is `/qfai-implement`'s execution
ledger, and `qfai-implement/SKILL.md` states the split: **`Layer = E2E`,
`Layer = API` and `Layer = Integration` rows are tracked there, but their tests
are authored here.** Integration is there because this skill's scope puts it
there: `QFAI-ATDD-112` covers every `L3` TC, and every TC with no declared
`Level`, from `tests/integration/**`, and P4 writes those tests. Self-owned,
they had `/qfai-implement` demand a fresh RED for a test already green here. **One `Integration` row is outside the set: one whose `TC-Refs` name only TCs that declare `Level` `L1` / `L2`.** `QFAI-ATDD-112` excludes those levels — CRITICAL CONSTRAINTS above says `L1`/`Unit` and `L2`/`Component` owe nothing here — so this stage authors no test for that row and requires no annotation for it, while the validator reports the `Layer` / `Level` contradiction as a **warning** only (`TDDLIST_COVERAGE_LAYER_MISMATCH`), so such a ledger passes `--fail-on error` and the row exists today. `qfai-implement/SKILL.md` Non-goals states the same carve-out from the other side and keeps the row owned there: that skill writes its test in its own Phase Red and keeps its evidence, anchor, checkpoint and cross-spec entries in `implement-<spec-id>.md`. **Every rule in this file and its references that names the ATDD-owned set excludes it** — this stage enumerates no such row, chooses no branch for it, writes no `## Ledger rows advanced` entry for it and hands it over to nobody. Demanding a branch and a handoff for a test this skill is forbidden to write is what left the row refused by both stages and stranded at `todo`; correcting the row's `Layer`, or the TC's `Level`, upstream is the durable fix.

- **This skill does not write the ledger.** `/qfai-implement` owns the `Status` / `DR-ID` / `Evidence` cells of every row — one writer, as `.qfai/assistant/constitution/drift-protocol.md` grants. This stage owes the **evidence those cells point at**, in `.qfai/evidence/atdd-<spec-id>.md`.
- **The lifecycle is `../qfai-implement/references/execution-ledger.md#allowed-transitions`**: forward-only from `todo`, and `todo -> red` requires an **admissible RED** observed before the code that makes it pass exists.
- **`/qfai-sdd` Phase 2b seeds one `Layer = E2E` row per active `US-*` and one `Layer = API` row per active `CON-API-*` the spec owns — the lowest-numbered spec naming that contract; this stage still cannot create them.** A spec with an active obligation **of its own** therefore normally arrives with rows here — enumerate them and build the handoff from them. Zero is legitimate when every obligation is exempt **and** every active `CON-API-*` the spec references is owned by another spec, and even then is not "nothing to do"; a row missing for an **active** obligation this spec owns is an incomplete Phase 2b — report it, never write it. Do not demand an API row for a contract another spec owns: that row must not exist twice. `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`.
- **A fresh spec may already carry `Layer = Integration` rows, and this stage cannot create those either.** `/qfai-sdd` Phase 2b seeds one per integration-level TC — every `Level` whose annotation routes to `tests/integration/**`: `L3`, `integration`, a blank cell, a spelling that names no layer (`smoke`), and `system` / `acceptance`; the same routing `QFAI-ATDD-112` uses — so on a spec whose TCs are all `L3` the rows are there at `todo` and enumerating them at P1b is this run's work: without their RED provenance `/qfai-implement` Phase Red step 3b finds no handoff and leaves each one at `todo`. Zero `E2E` / `API` rows beside them is the legitimate count, not "nothing to do": `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`.
- **The stage order makes that a real question**: Work Orders build the surfaces a journey needs (P3, P4), so a journey written after them passes first run — an anomaly bound for `exception`, which then becomes the only reachable terminal state.

### RED provenance for an ATDD-owned row (MUST)

**Read `references/red-provenance.md` before advancing any row.** It defines
three branches, in order — observed RED (stage gate **P1b**, before P2-P4 build
any surface), falsifiability when the surface is already there, and `exception`
with a `DR-*` when neither is available. Take the first that applies, record
which one, and put the evidence in `.qfai/evidence/atdd-<spec-id>.md` under
`## Ledger rows advanced` — `/qfai-implement` consumes that entry rather than
re-observing a RED. Branch 3 is the last resort: a stage that routes every row
to `exception` has recorded that it did not try branches 1 and 2.

## Scope (ATDD only)

In scope: E2E, API, Integration. Out of scope: Unit and Component
(`/qfai-implement`). Tests that must sign in: `references/credential-reuse.md`.

## Non-goals

- Unit/Component test implementation.
- Product feature changes beyond what is needed for ATDD test execution.

## Mandatory Outputs

1. Test Volume Estimate (signal table with evidence)
2. **Coverage Depth Matrix**, written to `.qfai/evidence/coverage-depth-<spec-id>.md` (per spec; template and scoring in `references/test-case-depth-checklist.md`). Committed — see CRITICAL CONSTRAINTS.
3. Coverage obligations checklist (`US` / `TC` / `CON-API` / `CON-DB`), and the implemented tests per layer (E2E/API/Integration)
4. Reviewer notes (`PASS` or concrete rework list)
5. Evidence file: `.qfai/evidence/atdd-<spec-id>.md`

## Volume Signals (mandatory, not gates)

Every row counts this spec's own obligations: E2E = required `US-*`, API = required `CON-API-*`, meaning the `CON-API-*` this spec references that are not deferred, Integration = required `TC-*` routing to `tests/integration/**` (`L3` or no `Level`) plus the **active** `CON-DB-*` this spec references — active meaning the contract declares no `-- x-qfai-status: planned` **on a line of its own** (leading whitespace is allowed, trailing SQL is not — a marker appended after a statement is not read). A contract that does declare it is deferred: it owes no `QFAI-ATDD-115` coverage in this slice, so it is not counted here. `L1`/`L2` owe nothing here; an `L4`/`L5` TC counts in the row its `Level` routes it to. `#TC` is the whole Integration numerator: `references/volume-signals.md` defines it as those `TC-*` **plus** the active `CON-DB-*`, so the row's Raw count is `#TC` alone and adding the contracts again would count each of them twice. Read `required` per ID kind from Coverage obligations — the `US-*` row is surface-scoped, and the contract rows drop every deferred contract: `x-qfai-status: planned` in an OpenAPI document for a `CON-API-*`, the SQL comment `-- x-qfai-status: planned` for a `CON-DB-*`. Filling either in from "every declared" overstates the Raw count before a single test is written.
Contract references come from the SSOT the spec carries — `Contract-Refs` in `04_Business-Rules.md`, plus a `QFAI-CONTRACT-REF` line in `01_Spec.md` when there is one — never the ledger; a contract deferred with `x-qfai-status: planned` — `-- x-qfai-status: planned` for a `CON-DB-*` — owes no test, so exclude it from the count and name it in `Notes`.
`E2E_s` / `API_s` / `INT_s`, their bands, and what a low or high one obliges: **`references/volume-signals.md`**. A `Signal` cell is never a copy of its `Raw count`; never fail on a signal value alone.

### Estimator output table (required)

| Layer       | Raw count | Signal | Evidence                                | Notes |
| ----------- | --------: | -----: | --------------------------------------- | ----- |
| E2E         |       #US |  E2E_s | user stories + `L5` TCs                 |       |
| API         |      #CON |  API_s | active `CON-API-*` + `L4` TCs           |       |
| Integration |       #TC |  INT_s | `L3`/no-`Level` TCs + active `CON-DB-*` |       |

## Scaffolding

`npx qfai atdd scaffold --spec <spec-id>` bulk-emits one placeholder test per `TC-*` **this skill owns**, each carrying its `QFAI:SPEC-XXXX:TC-YYYY` annotation, into `tests/integration/<spec-id>/` — the directory `QFAI-ATDD-112` scans. It is idempotent. `L1`/`L2` and `L4`/`L5` TCs are skipped and named on stderr, and a skeleton left in placeholder shape escalates: `references/scaffolding.md`.

## Annotation obligations (mandatory)

Every generated ATDD test MUST include QFAI annotations by layer:

- `tests/e2e/**`: `QFAI:SPEC-XXXX:US-YYYY` (plus `QFAI:SPEC-XXXX:TC-YYYY` for a TC that declares `Level` `L5`/`E2E`)
- `tests/integration/**`: `QFAI:SPEC-XXXX:TC-YYYY` (TCs declaring `L3`/`Integration`, and TCs with no declared `Level`)
- `tests/api/**`: `QFAI:CON-API-XXXX` (plus `QFAI:SPEC-XXXX:TC-YYYY` for a TC that declares `Level` `L4`/`API`)
- `tests/integration/**` also carries `QFAI:CON-DB-XXXX` for every declared DB
  contract the slice exercises

Notes:

- A TC's annotation belongs in exactly one directory — the one its declared `Level` routes to. Elsewhere it is both uncovered (`QFAI-ATDD-112`) and forbidden, symmetrically: one left behind in `tests/integration/**` after the TC moved to `L4`/`L5` is rejected by `QFAI-ATDD-123` just as an early one in `tests/api/**` is rejected by `QFAI-ATDD-121`.
- AC annotations are optional in code.
- `QFAI:CON-API-*` in E2E is not forbidden, but contract guarantee belongs to API tests.

## Success Criteria (Definition of Done)

- All required `US` are covered by E2E tests (`QFAI-ATDD-111`); a story outside the current slice is deferred with `- x-qfai-status: planned` in its `02_User-stories.md` block and reported by `QFAI-ATDD-118` (`info`), not left uncovered. — `required` as defined under Coverage obligations (every declared `US-*`, narrowed to user-facing specs once any one spec in the project declares a surface, project-wide before that). The DoD and the obligation read from that one definition; do not re-derive it here.
- All required `TC` are covered from the directory their declared `Level` routes
  to (`L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
  `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`, no declared `Level` ->
  `tests/integration/**`). **`L1`/`Unit` and `L2`/`Component` are outside this
  obligation** — the ledger covers them — so a spec whose TCs are all L1/L2 is
  done here with no ATDD annotation at all. Duplicating a TC into a second layer
  is a not-done condition, not extra credit.
- All required `CON-API` **this spec owns** are covered by API tests. Ownership is the merge in `references/cross-spec-obligations.md#resolving-the-owning-spec`, not membership in the finding: a contract a named sibling spec declares, recorded one row per ID under `## Cross-spec obligations`, is that spec's to cover and does not hold this bullet open. Residue that is unrecorded, attributable to no named sibling, or attributed to a spec this one co-owns the contract with does hold it open. `required` as defined under Coverage obligations (active contract **ids**, one per contract file, never per OpenAPI operation; `x-qfai-status: planned` defers the whole file).
- All required `CON-DB` **this spec owns** are covered by integration tests (`QFAI-ATDD-115`); a contract
  outside the current slice is deferred with `-- x-qfai-status: planned`, not left uncovered. Sibling-owned residue is read exactly as in the `CON-API` bullet above — recorded and attributed, it is that spec's; otherwise it is this run's.
- Validation passes for this spec in the two parts the scope model implies: (1) **no finding this spec owns remains**; and (2) **every residual finding is attributed and recorded**. Both parts met is **`PASS with cross-spec obligations`**; residue attributable to no named sibling spec is this spec's own and still FAILs (`references/cross-spec-obligations.md#the-validation-the-definition-of-done-asks-for`).
- Repository quality gates (format/lint/type/tests, and pack/verify if distributed) pass with evidence.
- Evidence file exists and includes work orders + reviewer notes.
- Every ledger row this cycle advanced carries one of the three RED-provenance forms — an observed RED pair with its `Oracle proof`, the `Satisfied-by` + falsifiability trio, or a `DR-*` recording why neither was available — and `qa-gatekeeper` has accepted it. The third form is a valid _branch_, and it is **not a completion**: `exception` is a blocking output and needs a user-approved `TDDLIST-001` waiver, or the row is parked and the spec stays open (`references/red-provenance.md#branch-3-does-not-close-a-spec-on-its-own`).
- Completion is approved by a reviewer who did not implement tests.
- **The P8 reviewer's `Audited evidence hash` is recomputed before completion is declared**, from the current stage evidence file and Coverage Depth Matrix — a mismatch means the evidence moved after the verdict (`references/pack-seal.md#recompute-the-p8-audit-hash-before-declaring-completion`).
- **The P8 review pack is sealed, and its seal is re-checked at completion against the recorded value** — `Review pack:` and `Review pack seal:` in the stage evidence file's `## Final status`, recorded before this stage writes its verdict (`references/pack-seal.md#seal-the-p8-pack`) and recomputed against that recorded value at completion (`references/pack-seal.md#recompute-the-seal-at-completion-against-the-recorded-value`).

## Not-done criteria

- Any required `US` / `TC` remains uncovered, or any required `CON-API` / `CON-DB` **this spec owns** does. A residual contract attributed to a named sibling spec and recorded under `## Cross-spec obligations` is **not** this criterion — that is the terminal state, and reading it back as "required and uncovered" restores from this line the deadlock the two-part DoD removes. Unrecorded, unattributable, or self-attributed residue is still this criterion. Reading `required` per ID kind from Coverage obligations (`US` by surface type, `TC` by declared `Level`, `CON-API` by active-vs-deferred).
- Forbidden references remain.
- Tests exist but were never executed.
- Validation evidence is missing, or failing on a finding this spec owns. **A residual `QFAI-ATDD-113` / `-115` attributed to a named sibling spec and recorded under `## Cross-spec obligations` is not this criterion** — it blocks _that_ spec's completion, not this one, and `/qfai-verify` settles the repo-wide residue at the end of the stage. Unrecorded residue is, and so is an entry that names no owning spec, names **this** spec as the owner, or omits the contract ID the finding cites.
- Coverage Depth Matrix is missing, omits the business rule coverage table on a spec that declares an active `BR-*`, or contains unjustified ❌ cells in either table, or that table drops an active `BR-ID` declared in `04_Business-Rules.md` (normal-path-only coverage is incomplete).
- A ledger row was advanced past `todo` with none of the three forms — no observed RED, no falsifiability evidence, and no `DR-*`.
- A row was sent to `exception` without a `DR-*` recording why **both** branches were unavailable. "The surface was built earlier in this cycle" is not such a reason.

## Failure handling (mandatory)

- If blocked/unknown, stop and raise a Decision Record.
- Do not declare completion when any gate is FAIL; iterate until PASS. A scoped validate gate that exits 1 **only** on residue attributed and recorded per `references/cross-spec-obligations.md` is not a FAIL gate — it is `PASS with cross-spec obligations`, and iterating on it is waiting for a sibling spec that is waiting for this one.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/atdd-<spec-id>.md`

Required sections: the template below is the list. Five of them carry a contract
the heading cannot:

- **Ledger rows advanced** — an index table plus one `### TDD-NNNN` section per
  row (`references/red-provenance.md#evidence-shape`). Exactly one form per row,
  never both and never neither; the cell is an anchor and the payload goes in
  the section. A rework round is a `#### Round N` block nested **inside that
  row's section**, not a section of its own: the list is closed, and nesting
  attributes it to a row (`references/review-fix-rounds.md`).
- **Grilling Session** — one row per session, with the open questions listed
  under the table. Each is written when that session ends, and its `Work resumed`
  when the stage next wrote, because a row holding only the ending reads the same
  whether the session ran before the work or after it. The Reviewer Gate reads it
  (`## Grilling (MANDATORY)`).
- **Coverage Depth Matrix** — a link to
  `.qfai/evidence/coverage-depth-<spec-id>.md` and the `✅`/`⚠️`/`❌` totals.
  The matrix and its per-`❌` justifications live in that committed file;
  restating them here would lose them.
- **Cross-spec obligations** — one row per uncovered contract ID the scoped gate still exits 1 on, never one per finding: `QFAI-ATDD-113` / `-115` aggregate every uncovered contract into one finding's `refs`, so split them into a row each. `None` when the run exited 0. It is what a completion reviewer reads to tell `PASS with cross-spec obligations` from an ordinary FAIL. Fields, worked example and the FAIL cases: `references/cross-spec-obligations.md#the-evidence-entry`.
- **Final status** — the verdict and its confirmer, plus `Review pack:` and `Review pack seal:` for the P8 pack this stage opened (`references/pack-seal.md#seal-the-p8-pack`). This section is excluded from the P8 audit subject, which is why the seal can be written here without making the verdict stale.

Template:

```md
# ATDD Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Grilling Session

<!-- One row per session, written when each ends. See this skill's
     `## Grilling (MANDATORY)` section; the open questions go under the
     table. -->

| Ended | Ended at | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ----- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

## Work performed (what changed, where)

## Commands executed + key outputs

## Test volume estimate

## Coverage obligations checklist

## Ledger rows advanced

<!-- Index table + one `### TDD-NNNN` section per row:
     `references/red-provenance.md#evidence-shape`. Rework rounds nest inside a
     row's section as `#### Round N`: `references/review-fix-rounds.md`. -->

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-<spec-id>.md` (committed). Totals: ✅ N / ⚠️ N / ❌ N.

## Work Orders Summary

## Cross-spec obligations

## Execution logs

## Gaps / Open risks

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

Review pack: `.qfai/review/review-<timestamp>/`
Review pack seal: <sha256>
```

## ATDD Work Orders (mandatory)

- **Test Case Depth Analyst**: `test-design-analyst` evaluates test cases using `references/test-case-depth-checklist.md`, produces Coverage Depth Matrix, flags gaps in boundary/error/edge coverage.
- Test Volume Estimator: compute US/TC/CON signals with evidence.
- ATDD Implementers, one per layer: required `US` coverage in E2E, `CON-API` in API, `TC` and `CON-DB` in Integration.
- Reviewer: validate coverage obligations + gate results + Coverage Depth Matrix (non-edit).
- Runtime Gatekeeper: run suites and capture logs.

## Completion Separation (mandatory)

- Implementation and completion approval must be separate.
- Reviewer must be non-edit (`PASS` or `REVISE` only).

## Stage Gates (Do not skip)

- P0: Plan and obligations checklist prepared. A project whose routing has no `red` phase predates it: `references/red-provenance.md#a-project-without-the-red-phase`.
- P1: Layer assignment validated against `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.
- P1a: **`Phase: Skeleton` is discharged before any RED is taken.** Invoke `/qfai-implement` for that phase alone, for **every in-scope entrypoint**, and record each run in `.qfai/evidence/skeleton.md`. **Enumerating zero entrypoints is an answer, not a skip**: a library or an Integration-only spec set still invokes the phase once, so the phase itself writes the `not applicable` verdict its `## (no entrypoint)` record requires. Left to an empty loop, that record is never written and this item passes with nothing behind it. Not only when the program fails to start: the phase itself decides between a first run, a re-run of a recorded pass, and `not applicable`, and an entrypoint the evidence file has no section for is unproven for this invocation whatever the program does today (`../qfai-implement/references/walking-skeleton.md#evidence`). Here, not "before P5": P1c takes the first RED before P2-P4 build anything, and against a system that cannot start that RED is a collection error, which is a missing seam and not a RED (`references/red-provenance.md#a-project-whose-program-does-not-start-yet`).
- P1b: **A branch is chosen for every row this stage owns**, provisional until its handoff. The ATDD-owned set is the one `## Execution Ledger: the rows this skill feeds` defines, so an `Integration` row whose `TC-Refs` name only `L1` / `L2` TCs gets no branch and no handoff here: this stage may not write its test, and requiring either of a row `/qfai-implement` owns left this gate unpassable.
- P1c: **A branch 1 row is discharged in that loop** — write the test, take the
  RED, `qa-gatekeeper` PASS, hand it to `/qfai-implement`, GREEN, checkpoint —
  before the next branch-1 row's failing test is written, and before P2-P4 build
  any surface. One loop per `TDD-ID`; the nested run is an item cycle, not a
  completion gate (`references/red-provenance.md#what-the-nested-run-owes`).
- P1d: **Branch 3 rows are judged here, then handed over.** Route
  `qa-gatekeeper` on the `DR-*` — the claim is that the obligation genuinely
  cannot be observed — and hand the row over **with that PASS recorded**. P1b's
  gatekeeper judges branch 1 only and `/qfai-implement`'s exception path writes
  `todo -> exception` and stops, so without this a correct branch-3 row reached
  a terminal status judged by nobody. `/qfai-implement` is the only writer of
  `Status` / `DR-ID` / `Evidence`, so every branch needs a handoff; which goes
  when: `references/red-provenance.md#which-stage-hands-a-row-over`.
- P2: E2E implementation completed.
- P3: API implementation completed.
- P4: Integration implementation completed.
- P4b: **Branch 2 rows are handed over**, after P4 and before P6 — their mutation
  needs the surface P2-P4 build, the trio is the row's RED payload, and that nested
  run is an item cycle like P1c's (`references/red-provenance.md#what-the-nested-run-owes`).
- P5: Validation gate passed.
- P6: Runtime evidence captured.
- P7: Repo quality gates passed.
- P8: Reviewer confirms completion.

## Completion Criteria (Final Gate)

Before declaring completion:

1. Confirm required `US` / `TC` / `CON-API` / `CON-DB` coverage is complete for the obligations this spec owns; a sibling-owned `CON-API` / `CON-DB` recorded under `## Cross-spec obligations` is complete here and open there.
2. Run:

   ```bash
   npx qfai validate --profile atdd --fail-on error --spec <spec-id>
   ```

   `--spec` scopes the gate to the spec this invocation owns. Omitting it makes
   the gate report obligations belonging to specs this run never touched, which
   is how a spec with every obligation discharged still fails to close.

3. Run repository standard gates:
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)
4. Record exact commands and outcomes.

If commands cannot be run due to environment limits, request user execution and do not assume PASS.

## Output

- Acceptance test implementation files (with required annotations)
- Runbook snippet (copy-paste command)
- Verification evidence summary
- Gate results (`PASS` / `PASS with cross-spec obligations` / `FAIL`) — the middle one names its recorded obligations in the completion report

## DONE Declaration (Mandatory Output)

Include the referenced inputs (instructions/steering and spec delta), the DR-IDs
referenced (or "none"), and confirmation that no rejected options were
reintroduced (or the RE-OPEN DR-IDs).

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] Mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by an independent reviewer.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated.
- [ ] Open questions that place a **new obligation on the product** were routed to the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per `.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations`; questions about this skill's own inputs or settings stay in its own output for the user to answer. This skill does not write `08_Open-questions.md`.
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-implement`.
  Action: run unified TDD micro-cycle (Red/Green/Refactor) one test at a time from test-list.md.
- Acceptance tests need fixes: rerun `/qfai-atdd`.
  Action: close uncovered `US` / `TC` / `CON-API` / `CON-DB` obligations and rerun validation.

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

- Coverage obligations stay layer-pinned for US, CON-API and CON-DB: tests/e2e/\*\* must cover all required US; tests/api/\*\* all required CON-API; tests/integration/\*\* all required CON-DB (QFAI-ATDD-115 — defer an out-of-slice contract **this spec owns** with `-- x-qfai-status: planned` on a line of its own, never appended after a statement, and never leave it uncovered; a sibling spec's uncovered contract is recorded as a cross-spec obligation and its file left alone, because marking it defers that spec's test and hides a real gap). "Required" narrows differently per ID kind — US by surface type (a project-wide opt-in: active only once some spec declares a user-facing surface, project-wide before that), TC by declared Level, CON-API by active-vs-deferred, counted per declared QFAI-CONTRACT-ID (one per file) and never per OpenAPI operation (x-qfai-status: planned defers that whole contract file, as a top-level key or as a column-0 comment; under an operation it is ignored). Resolving the US opt-in needs qfai.config.yaml (paths.specsDir / paths.contractsDir first, then prototyping.primarySpecId), every ui contract path relative to <contractsDir>/ui/ — not just the basename, since a spec-<spec-id>/ ancestor directory is itself the match — and every sibling 01_Spec.md frontmatter or legacy "# … prototyping …" heading, read before the Volume Estimate. Each TC whose Level routes to an ATDD home is covered from the directory that Level routes to (L3/Integration -> tests/integration/\*\*, L4/API -> tests/api/\*\*, L5/E2E -> tests/e2e/\*\*; everything else that is not Unit/Component — no declared Level, an unreadable spelling, and system / acceptance -> tests/integration/\*\*). L1/Unit and L2/Component owe no ATDD annotation — tdd/test-list.md covers them. An existing one in tests/integration/\*\* is neither counted nor flagged, so do not require adding or removing it.
- Forbidden references guard the test-layer policy: a TC annotation outside its declared home is rejected — tests/api/** must not carry QFAI:SPEC-XXXX:TC-YYYY unless that TC declares L4/API, and tests/e2e/** likewise unless it declares L5/E2E.
- Floor / ratio signals are planning hints, never gates; legacy scenario.feature / coverage ledger files remain optional inputs.
