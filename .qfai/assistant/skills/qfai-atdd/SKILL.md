---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Implement automated acceptance tests (E2E/API/Integration) aligned with US/TC/CON-API obligations from specs and contracts."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
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

- P1: `.qfai/assistant/constitution/*`
- P2: `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`
- P3: `.qfai/specs/<spec-id>/01_Spec.md` (Primary SSOT / Consumer View)
- P4: specs/contracts obligations
  - `.qfai/specs/<spec-id>/02_User-stories.md` (US)
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md` (AC)
  - `.qfai/specs/<spec-id>/05_Examples.md` (EX)
  - `.qfai/specs/<spec-id>/06_Test-Cases.md` (TC)
  - `.qfai/specs/<spec-id>/tdd/test-list.md` (the execution ledger — enumerate the `Layer = E2E` / `Layer = API` / `Layer = Integration` rows this run owes evidence for, with their `TDD-ID`, obligation column and `Selector`)
  - `.qfai/contracts/api/**` (CON-API)
  - `.qfai/contracts/db/**` (CON-DB)
  - `.qfai/contracts/ui/**` and `.qfai/contracts/design/**` when the target spec is UI-bearing
- P5: `.qfai/specs/<spec-id>/07_Decisions.md` + `.qfai/specs/_policies/08_Decisions.md` (Decision Records, `DR-*`; if no spec yet, state "not applicable")
- P6: legacy artifacts (optional only)
  - `.qfai/specs/<spec-id>/scenario.feature`
  - coverage ledger files

Do not read discussion-pack UI/UX sidecars. UI-bearing acceptance tests consume only specs and contracts normalized by `/qfai-sdd`.

## Read Set Contract (Mandatory)

- Default Mode:
  - `.qfai/specs/<spec-id>/01_Spec.md`
  - `.qfai/specs/<spec-id>/03_Acceptance-Criteria.md`
  - `.qfai/specs/<spec-id>/05_Examples.md`
  - `.qfai/specs/<spec-id>/06_Test-Cases.md`
  - `.qfai/specs/<spec-id>/tdd/test-list.md` — read, never written. A seeded row's `Test file` and `Selector` are still `-` there, because Phase 2b seeds them before any test exists: record the path and selector of the test **this run authored** as the handoff entry's row identity rather than copying that placeholder, since this stage is where they first exist and `/qfai-implement` Phase Red step 3b is the step that writes them into the ledger. A run that does not enumerate its `Layer = E2E` / `Layer = API` / `Layer = Integration` rows produces no `## Ledger rows advanced` entry for them, and `/qfai-implement` Phase Red step 3b then stops on a missing handoff.
- Escalation Mode:
  - allowed only when `01_Spec.md` Escalation Hook signals ambiguity / conflict / missing constraint / trade-off
  - read only `.qfai/specs/_policies/01_Objective.md` and `.qfai/specs/_policies/08_Decisions.md`
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
- Final completion gate MUST be delegated to an independent `completion-reviewer`.
- ATDD-specific reviewer checks:
  - coverage obligations met: E2E covers `US`, API covers `CON-API`, and every `TC` **that declares `L3`/`L4`/`L5` or no `Level`** is covered from the directory that `Level` routes to. `L1`/`Unit` and `L2`/`Component` owe nothing here (CRITICAL CONSTRAINTS): the ledger covers them. An existing L1/L2 annotation in `tests/integration/**` is not a violation — the validator declines to count it and declines to flag it — so do not require one to be added, and do not require an existing one to be removed;
  - Coverage Depth Matrix and its business rule coverage table are reviewed and no unjustified `❌` cells remain in either; that table is reconciled against the spec's `04_Business-Rules.md`, which the reviewer work order MUST carry as an input — every active `BR-ID` it declares owns a row, whether the declaration is a Rule Table row or a `BR-*` heading carrying no retiring `Status:`, and a table of only `✅` rows that drops a declared rule is a REVISE, not a PASS (a spec declaring no active `BR-*` states the omission instead of carrying the table);
  - validation evidence exists and `npx qfai validate --profile atdd --fail-on error --spec <spec-id>` reached one of its **two** passing states — exit 0, or `PASS with cross-spec obligations`: every finding this spec owns is clean, and each residual `QFAI-ATDD-113` / `-115` is recorded one row per contract under `## Cross-spec obligations` with a named sibling owner. Exit 1 alone is not `REVISE` here; residue that is unrecorded, unattributable, or attributed to this spec is (`references/cross-spec-obligations.md`);
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

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion based on unit/component tests.
- `10_Plan.md` is the primary How SSOT for execution phases.
- If `10_Plan.md` is missing, stop and run owner planning flow before proceeding.
- Completion gate is validation with zero errors **for this spec**: `npx qfai validate --profile atdd --fail-on error --spec <spec-id>`. The scope flag is not optional bookkeeping. This skill runs one spec per invocation, and unscoped it reports every other spec's `QFAI-ATDD-111` / `-112` obligations — findings this run cannot act on and must not be blocked by. A `--spec` run also writes `<report>/validate.spec-<id>.json` rather than the shared `validate.json`, so the JSON gate artifact is per spec, and an unknown or unparseable value fails the run (`QFAI-SCOPE-001` / `QFAI-SCOPE-002`) instead of silently widening back to the whole repository. **That is not the same as being parallel-safe.** `<report>/validate.log` and the run-log pointer are shared by every run, scoped or not, and nothing serializes them — so two stages running at once can leave that pointer naming the other one's run. Cite the per-run `<report>/run-*/` directory, or this spec's `validate.spec-<id>.json`, as the Validate Hard Gate evidence; do not cite `validate.log` from a run you shared with another stage.
- **`--spec` scopes the spec-owned rules only, and the gate still fails on the rest.** Every rule whose finding names a spec is scoped: `QFAI-ATDD-111` (US) and `QFAI-ATDD-112` (TC) by the specs they name, `QFAI-ATDD-101` / `-102` by the spec in the unknown token, `QFAI-ATDD-121` / `-122` / `-123` by the specs whose TCs are misplaced, and `D-SCAFFOLD-PLACEHOLDER` by the spec its skeleton belongs to. A scoped run reports all of those for the requested spec and drops a sibling's. What cannot be scoped **does** fail a scoped gate — `QFAI-ATDD-113` (`CON-API`) and `QFAI-ATDD-115` (`CON-DB`), attributed to `.qfai/contracts/**`, which has no spec owner in the model, and the repo-level cases beside them: `references/cross-spec-obligations.md#what-the-scope-flag-cannot-narrow` enumerates all of them.

  So a sibling spec's uncovered contract exits 1 on this spec's gate. That is a real limit, not a formality. When it happens: record the finding, its owning spec and why it is not this stage's work as a cross-spec obligation in this stage's evidence, under `## Cross-spec obligations`, and say so in the completion report — do **not** claim the gate passed, weaken the profile, lower `--fail-on`, or waive it. Closing them is the owning spec's next `/qfai-atdd` run. The repo-wide run belongs to `/qfai-verify`, at the end of the stage. **That record is a terminal state, not a deferral of one**: a run whose every residual finding is attributed to a named sibling spec completes as **`PASS with cross-spec obligations`** (`#success-criteria-definition-of-done`), and the repo-wide `/qfai-verify` run settles the residue. Unnamed, that state is unreachable — the owning spec's run hits this same block from the other side, so every spec waits for every other one and the four moves just forbidden are the only exits left. It is not free: a finding you cannot attribute to a named sibling spec is **this** spec's, and it fails.

- Coverage obligations are mandatory:
  - `tests/e2e/**` must cover all required `US-*`. A story outside the current slice is deferred in `02_User-stories.md` with a `- x-qfai-status: planned` meta line in its own `US-XXXX` block (a `##`-or-deeper heading, or its catalog list entry) — the same token both contract kinds use — and is named at `info` by `QFAI-ATDD-118`. It is not left uncovered, and it is not covered by a test that asserts nothing. `exception` is not the alternative here: that branch belongs to a ledger row, and a `US-*` owns none (`references/red-provenance.md#a-spec-with-no-atdd-owned-rows`).
  - Every `TC-*` must be covered from the directory its declared `Level` routes
    to: `L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
    `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`. A TC with no declared `Level`
    routes to `tests/integration/**`.
  - **`L1`/`Unit` and `L2`/`Component` owe nothing here** — out of this skill's
    scope, excluded from `QFAI-ATDD-112`, gated by `tdd/test-list.md` under
    `/qfai-implement`, and named on every run by `QFAI-ATDD-117` (`info`). Do
    not duplicate an L1/L2 annotation into `tests/integration/**` to quiet a
    gate: that is the all-integration collapse `catalog/test-layers.md` lists as
    an anti-pattern.
  - `tests/api/**` must cover all required `CON-API-*`. **An ID carried by a file that declares no test is not coverage**: the scan reads markdown too, and a `.test.ts` holding only the annotation is the same ledger renamed. `QFAI-ATDD-119` (`info`) names them, and coverage is `missing` **and** `coveredByCarrierOnly` in `summary.json`, never `missing` alone. This skill runs one spec, so gate on the narrowed `QFAI-ATDD-119` in `<report>/validate.spec-<id>.json`: `summary.json` stays repo-wide under every scope, and a sibling spec's placeholder would keep its arrays non-empty forever.
- Forbidden references (a TC annotation outside its declared home):
  `tests/api/**` and `tests/e2e/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY`
  unless that TC declares `Level` `L4`/`API` or `L5`/`E2E` respectively.
- Unknown references (`US/TC/CON-API` not declared) must be treated as errors.
- **The E2E/API ledger rows this stage feeds are bound by `/qfai-implement`'s lifecycle.** See "Execution Ledger" below: a row advanced on none of the three RED-provenance forms is a lifecycle violation.
- Floors/ratios are planning signals only, not gates.
- Legacy `scenario.feature` or coverage ledgers may exist but are not mandatory inputs for completion.
- The per-item evidence file `.qfai/evidence/atdd-<spec-id>.md` is required and
  committed. Ledger `Evidence` cells point to its anchors, and validation must
  resolve them on a fresh clone. The managed `.gitignore` block re-includes it,
  alongside `.qfai/evidence/implement-<spec-id>.md`. **Governance records also
  stay in version control**: Change Requests (`.qfai/decisions/CR-*.md`),
  durable decision records (`.qfai/evidence/decisions/*.json`) and the
  **Coverage Depth Matrix** (`.qfai/evidence/coverage-depth-<spec-id>.md`).
- **The matrix is a governance record, not a log**, so it is committed:
  `.qfai/evidence/coverage-depth-<spec-id>.md`, one justification per `❌`
  (`references/test-case-depth-checklist.md#where-the-matrix-lives`).

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check** (this skill's override): the acceptance tests **this run created or changed** — every `tests/e2e/**`, `tests/api/**` and `tests/integration/**` file you wrote or edited, filled-in scaffolds among them — executed with the runner from `catalog/tech.md#standard-commands-copy-paste`, reaching a red/green verdict rather than a collection or import error. Not "the tests you just scaffolded": `scaffold` emits the Integration-owned `TC`s only, so an E2E/API-only run has no scaffold output at all and would have had nothing to execute. A run that wrote no test file still has a target — a spec whose obligations were already satisfied and only re-verified — and it is the spec's existing acceptance suite: the files carrying this spec's `US` / `TC` / `CON-API` annotations, in the directories those obligations route to, run the same way. A run that never reached the assertions is UNRUN, not a pass.
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
they had `/qfai-implement` demand a fresh RED for a test already green here.

- **This skill does not write the ledger.** `/qfai-implement` owns the `Status` / `DR-ID` / `Evidence` cells of every row — one writer, as `constitution/drift-protocol.md` grants. This stage owes the **evidence those cells point at**, in `.qfai/evidence/atdd-<spec-id>.md`.
- **The lifecycle is `../qfai-implement/references/execution-ledger.md#allowed-transitions`**: forward-only from `todo`, and `todo -> red` requires an **admissible RED** observed before the code that makes it pass exists.
- **`/qfai-sdd` Phase 2b seeds one `Layer = E2E` row per active `US-*` and one `Layer = API` row per active `CON-API-*` the spec owns — the lowest-numbered spec naming that contract; this stage still cannot create them.** A spec with an active obligation **of its own** therefore normally arrives with rows here — enumerate them and build the handoff from them. Zero is legitimate when every obligation is exempt **and** every active `CON-API-*` the spec references is owned by another spec, and even then is not "nothing to do"; a row missing for an **active** obligation this spec owns is an incomplete Phase 2b — report it, never write it. Do not demand an API row for a contract another spec owns: that row must not exist twice. `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`.
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
3. Coverage obligations checklist (`US` / `TC` / `CON-API`), and the implemented tests per layer (E2E/API/Integration)
4. Reviewer notes (`PASS` or concrete rework list)
5. Evidence file: `.qfai/evidence/atdd-<spec-id>.md`

## Volume Signals (mandatory, not gates)

Every row counts this spec's own obligations: E2E = required `US-*`, API = the `CON-API-*` this spec references, Integration = required `TC-*` routing to `tests/integration/**` (`L3` or no `Level`) plus the `CON-DB-*` this spec references. `L1`/`L2` owe nothing here; an `L4`/`L5` TC counts in the row its `Level` routes it to.
Contract references come from the SSOT the spec carries — `Contract-Refs` in `04_Business-Rules.md`, plus a `QFAI-CONTRACT-REF` line in `01_Spec.md` when there is one — never the ledger; a contract deferred with `x-qfai-status: planned` owes no test, so exclude it from the count and name it in `Notes`.
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

- All required `US` are covered by E2E tests (`QFAI-ATDD-111`); a story outside the current slice is deferred with `- x-qfai-status: planned` in its `02_User-stories.md` block and reported by `QFAI-ATDD-118` (`info`), not left uncovered.
- All required `TC` are covered from the directory their declared `Level` routes
  to (`L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
  `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`, no declared `Level` ->
  `tests/integration/**`). **`L1`/`Unit` and `L2`/`Component` are outside this
  obligation** — the ledger covers them — so a spec whose TCs are all L1/L2 is
  done here with no ATDD annotation at all. Duplicating a TC into a second layer
  is a not-done condition, not extra credit.
- All required `CON-API` **this spec owns** are covered by API tests. Ownership is the merge in `references/cross-spec-obligations.md#resolving-the-owning-spec`, not membership in the finding: a contract a named sibling spec declares, recorded one row per ID under `## Cross-spec obligations`, is that spec's to cover and does not hold this bullet open. Residue that is unrecorded, attributable to no named sibling, or attributed to a spec this one co-owns the contract with does hold it open.
- All required `CON-DB` **this spec owns** are covered by integration tests (`QFAI-ATDD-115`); a contract
  outside the current slice is deferred with `-- x-qfai-status: planned`, not left uncovered. Sibling-owned residue is read exactly as in the `CON-API` bullet above — recorded and attributed, it is that spec's; otherwise it is this run's.
- Validation passes for this spec in the two parts the scope model implies — run `npx qfai validate --profile atdd --fail-on error --spec <spec-id>`, then: (1) **no finding this spec owns remains**, every rule `--spec` narrows reporting clean for `<spec-id>`; and (2) **every residual finding is attributed and recorded**, since `QFAI-ATDD-113` / `-115` are filed against `.qfai/contracts/**`, which no spec owns, so a sibling's uncovered contract holds the command at exit 1 — each such finding names its owning sibling spec under `## Cross-spec obligations` in this stage's evidence, and the completion report says so. Both parts met is **`PASS with cross-spec obligations`**, the terminal state of a run that discharged everything its spec owns; requiring exit 0 outright left that run not-done with no other state to be in, which is the reading that ends in one of the four moves CRITICAL CONSTRAINTS forbids. A residual finding attributable to no named sibling spec is this spec's own and still FAILs (`references/cross-spec-obligations.md`).
- Repository quality gates (format/lint/type/tests, and pack/verify if distributed) pass with evidence.
- Evidence file exists and includes work orders + reviewer notes.
- Every ledger row this cycle advanced carries one of the three RED-provenance forms — an observed RED pair with its `Oracle proof`, the `Satisfied-by` + falsifiability trio, or a `DR-*` recording why neither was available — and `qa-gatekeeper` has accepted it. The third form is a valid _branch_, and it is **not a completion**: `exception` is a blocking output and needs a user-approved `TDDLIST-001` waiver, or the row is parked and the spec stays open (`references/red-provenance.md#branch-3-does-not-close-a-spec-on-its-own`).
- Completion is approved by a reviewer who did not implement tests.
- **The P8 reviewer's `Audited evidence hash` is recomputed before completion is declared**, from the current stage evidence file and Coverage Depth Matrix, by the stage-review procedure that produced it (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`); a mismatch means the evidence moved after the verdict. **Seal the P8 pack too**: when the last reviewer response lands, and before this stage writes its verdict, hash the pack this stage opened — `.qfai/review/review-<timestamp>/`, whole — by the same procedure, and record it **outside the pack** in the stage evidence file's `## Final status` as `Review pack:` (that path) and `Review pack seal:` (that hash). That section is the one part excluded from the P8 audit subject, so writing it there does not stale the verdict, and it exists even on a spec with no ATDD-owned rows — where there is no item evidence entry to hold the seal at all. At completion, recompute the seal over the recorded path and compare it with the **recorded** value — `../qfai-implement/references/evidence-revision.md` states that rule once and it applies here: `## Final status` is outside every audit subject and outside the working-tree revision, so an expected value read from the working tree could be rewritten in the same pass that edited the pack, and every recomputation would still agree, and check that `## Final status` says what that pack says. The recording and the recomputation must be two moments: a value computed from the pack at completion always matches itself whatever was edited in between, and the stage hash covers the evidence but not the verdict, so a `REVISE` edited to `PASS` in the response, the summary and the status together left every recomputation unchanged. On a spec with no ATDD-owned rows `/qfai-implement`'s gate item 10 never runs, so without this the stored hash was written by P8 and read by nobody — and the evidence tree is out of the working-tree revision, so a later edit moved nothing else either.

## Not-done criteria

- Any required `US` / `TC` remains uncovered, or any required `CON-API` / `CON-DB` **this spec owns** does. A residual contract attributed to a named sibling spec and recorded under `## Cross-spec obligations` is **not** this criterion — that is the terminal state, and reading it back as "required and uncovered" restores from this line the deadlock the two-part DoD removes. Unrecorded, unattributable, or self-attributed residue is still this criterion.
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

Required sections: the template below is the list. Three of them carry a contract
the heading cannot:

- **Ledger rows advanced** — an index table plus one `### TDD-NNNN` section per
  row. Exactly one form per row, never both and never neither; the cell is an
  anchor and the payload goes in the section
  (`references/red-provenance.md#evidence-shape`).
- **Coverage Depth Matrix** — a link to
  `.qfai/evidence/coverage-depth-<spec-id>.md` and the `✅`/`⚠️`/`❌` totals.
  The matrix and its per-`❌` justifications live in that committed file;
  restating them here would lose them.
- **Cross-spec obligations** — one row per uncovered contract ID the scoped gate still exits 1 on, never one per finding: `QFAI-ATDD-113` / `-115` aggregate every uncovered contract into one finding's `refs`, so split them into a row each. `None` when the run exited 0. It is what a completion reviewer reads to tell `PASS with cross-spec obligations` from an ordinary FAIL. Fields, worked example and the FAIL cases: `references/cross-spec-obligations.md#the-evidence-entry`.

Template:

```md
# ATDD Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Test volume estimate

## Coverage obligations checklist

## Ledger rows advanced

<!-- Index table + one `### TDD-NNNN` section per row:
     `references/red-provenance.md#evidence-shape`. -->

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-<spec-id>.md` (committed). Totals: ✅ N / ⚠️ N / ❌ N.

## Work Orders Summary

## Cross-spec obligations

## Execution logs

## Gaps / Open risks

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed
```

## ATDD Work Orders (mandatory)

- **Test Case Depth Analyst**: `test-design-analyst` evaluates test cases using `references/test-case-depth-checklist.md`, produces Coverage Depth Matrix, flags gaps in boundary/error/edge coverage.
- Test Volume Estimator: compute US/TC/CON signals with evidence.
- ATDD Implementers, one per layer: required `US` coverage in E2E, `CON-API` in API, `TC` in Integration.
- Reviewer: validate coverage obligations + gate results + Coverage Depth Matrix (non-edit).
- Runtime Gatekeeper: run suites and capture logs.

## Completion Separation (mandatory)

- Implementation and completion approval must be separate.
- Reviewer must be non-edit (`PASS` or `REVISE` only).

## Stage Gates (Do not skip)

- P0: Plan and obligations checklist prepared. A project whose routing has no
  `red` phase predates it: `references/red-provenance.md#a-project-without-the-red-phase`.
- P1: Layer assignment validated against `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.
- P1b: **A branch is chosen for every row**, provisional until its handoff.
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

1. Confirm required `US` / `TC` / `CON-API` coverage is complete for the obligations this spec owns; a sibling-owned `CON-API` / `CON-DB` recorded under `## Cross-spec obligations` is complete here and open there.
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
- [ ] Open questions that place a **new obligation on the product** were routed to the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per `constitution/drift-protocol.md#reviewer-originated-obligations`; questions about this skill's own inputs or settings stay in its own output for the user to answer. This skill does not write `08_Open-questions.md`.
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-implement`.
  Action: run unified TDD micro-cycle (Red/Green/Refactor) one test at a time from test-list.md.
- Acceptance tests need fixes: rerun `/qfai-atdd`.
  Action: close uncovered `US` / `TC` / `CON-API` obligations and rerun validation.

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

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and MAY instantiate a category entry — `approval-required governance operations` — with the operations its own run cannot authorize for itself. It MUST NOT introduce an entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

project_memory:

- Coverage obligations stay layer-pinned for US and CON-API: tests/e2e/** must cover all required US; tests/api/\*\* all required CON-API. Each TC declaring L3/L4/L5, or no Level, is covered from the directory that Level routes to (L3/Integration -> tests/integration/**, L4/API -> tests/api/\*\*, L5/E2E -> tests/e2e/\*\*; no declared Level -> tests/integration/\*\*). L1/Unit and L2/Component owe no ATDD annotation — tdd/test-list.md covers them. An existing one in tests/integration/\*\* is neither counted nor flagged, so do not require adding or removing it.
- Forbidden references guard the test-layer policy: a TC annotation outside its declared home is rejected — tests/api/** must not carry QFAI:SPEC-XXXX:TC-YYYY unless that TC declares L4/API, and tests/e2e/** likewise unless it declares L5/E2E.
- Floor / ratio signals are planning hints, never gates; legacy scenario.feature / coverage ledger files remain optional inputs.
