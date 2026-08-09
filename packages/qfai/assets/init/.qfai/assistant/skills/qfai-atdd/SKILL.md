---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Implement automated acceptance tests (E2E/API/Integration) aligned with US/TC/CON-API obligations from specs and contracts."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
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
  - `.qfai/specs/<spec-id>/tdd/test-list.md` (the execution ledger — enumerate the `Layer = E2E` / `Layer = API` rows this run owes evidence for, with their `TDD-ID`, obligation column and `Selector`)
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
  - `.qfai/specs/<spec-id>/tdd/test-list.md` — read, never written. A run that does not enumerate its `Layer = E2E` / `Layer = API` rows produces no `## Ledger rows advanced` entry for them, and `/qfai-implement` Phase Red step 3b then stops on a missing handoff.
- Escalation Mode:
  - allowed only when `01_Spec.md` Escalation Hook signals ambiguity / conflict / missing constraint / trade-off
  - read only `.qfai/specs/_policies/01_Objective.md` and `.qfai/specs/_policies/08_Decisions.md`
- Do not read `_policies/**` by default.

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
  - Coverage Depth Matrix is reviewed and no unjustified `X` cells remain;
  - validation evidence exists and `npx qfai validate --profile atdd --fail-on error` passes;
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
- Completion gate is validation with zero errors (`npx qfai validate --profile atdd --fail-on error`).
- Coverage obligations are mandatory:
  - `tests/e2e/**` must cover all required `US-*`.
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
  - `tests/api/**` must cover all required `CON-API-*`.
- Forbidden references (a TC annotation outside its declared home):
  `tests/api/**` and `tests/e2e/**` must not contain `QFAI:SPEC-XXXX:TC-YYYY`
  unless that TC declares `Level` `L4`/`API` or `L5`/`E2E` respectively.
- Unknown references (`US/TC/CON-API` not declared) must be treated as errors.
- **The E2E/API ledger rows this stage feeds are bound by `/qfai-implement`'s lifecycle.** See "Execution Ledger" below: a row advanced on none of the three RED-provenance forms is a lifecycle violation.
- Floors/ratios are planning signals only, not gates.
- Legacy `scenario.feature` or coverage ledgers may exist but are not mandatory inputs for completion.
- Evidence file is required under `.qfai/evidence/`. Stage evidence is
  **regenerable** and is not committed. **Governance records are different**:
  Change Requests (`.qfai/decisions/CR-*.md`), durable decision records
  (`.qfai/evidence/decisions/*.json`) and the **Coverage Depth Matrix**
  (`.qfai/evidence/coverage-depth-<spec-id>.md`) are not regenerable and stay
  in version control — the managed `.gitignore` block negates them for that
  reason.
- **The matrix is a governance record, not a log**, so it is committed:
  `.qfai/evidence/coverage-depth-<spec-id>.md`, one justification per `❌`
  (`references/test-case-depth-checklist.md#where-the-matrix-lives`).

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Goal

Turn specs/contracts obligations (`US` / `TC` / `CON-API` / `CON-DB`) into runnable acceptance tests in this repository.

## Execution Ledger: the rows this skill feeds

`.qfai/specs/<spec-id>/tdd/test-list.md` is `/qfai-implement`'s execution
ledger, and `qfai-implement/SKILL.md` states the split: **`Layer = E2E` and
`Layer = API` rows are tracked there, but their tests are authored here.**

- **This skill does not write the ledger.** `/qfai-implement` owns the `Status` / `DR-ID` / `Evidence` cells of every row — one writer, as `constitution/drift-protocol.md` grants. This stage owes the **evidence those cells point at**, in `.qfai/evidence/atdd-<spec-id>.md`.
- **The lifecycle is `../qfai-implement/references/execution-ledger.md#allowed-transitions`**: forward-only from `todo`, and `todo -> red` requires an **admissible RED** observed before the code that makes it pass exists.
- **A fresh spec has none of these rows yet, and this stage cannot create them** — zero is a legitimate count, not "nothing to do": `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`.
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
(`/qfai-implement`).

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

E2E = required `US-*`, API = declared `CON-API-*`, Integration = required `TC-*`.
When a signal is low or high, propose options and a recommendation; never fail
on a signal value alone.

### Estimator output table (required)

| Layer       | Raw count | Signal | Evidence      | Notes |
| ----------- | --------: | -----: | ------------- | ----- |
| E2E         |       #US |  E2E_s | user stories  |       |
| API         |      #CON |  API_s | API contracts |       |
| Integration |       #TC |  INT_s | test cases    |       |

## Scaffolding

`npx qfai atdd scaffold --spec <spec-id>` bulk-emits one placeholder test per
`TC-*` **this skill owns**, each carrying its `QFAI:SPEC-XXXX:TC-YYYY`
annotation. Skeletons land in `tests/integration/<spec-id>/` — the directory
`QFAI-ATDD-112` scans — so a filled-in skeleton counts as coverage. It is
idempotent: existing files are left untouched.

Skeletons are integration-only, so two groups of TC are **skipped**, both named
on stderr. `L1`/`Unit` and `L2`/`Component`: their skeleton would land in
`tests/integration/**`, the duplication the Coverage obligations section
forbids, and `QFAI-ATDD-112` would not count it — filling one in discharges
nothing. Their ledger row under `/qfai-implement` is where they are owed.
`L4`/`API` and `L5`/`E2E`: their home is `tests/api/**` / `tests/e2e/**`, so an
integration skeleton is both uncounted and a forbidden reference
(`QFAI-ATDD-123`). Author those by hand in their own directory — or re-file the
obligation as `CON-API-*` / `US-*`, which is what a `TC-*` at L4/L5 usually
means (`catalog/test-layers.md#annotation-routing`).

A skeleton left in placeholder shape across repeated validate runs escalates
(`qfai.config.yaml#atdd.scaffoldEscalateCycles`), so scaffolding is a start, not
a discharge of the obligation.

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

- All required `US` are covered by E2E tests.
- All required `TC` are covered from the directory their declared `Level` routes
  to (`L3`/`Integration` -> `tests/integration/**`, `L4`/`API` ->
  `tests/api/**`, `L5`/`E2E` -> `tests/e2e/**`, no declared `Level` ->
  `tests/integration/**`). **`L1`/`Unit` and `L2`/`Component` are outside this
  obligation** — the ledger covers them — so a spec whose TCs are all L1/L2 is
  done here with no ATDD annotation at all. Duplicating a TC into a second layer
  is a not-done condition, not extra credit.
- All required `CON-API` are covered by API tests.
- All required `CON-DB` are covered by integration tests (`QFAI-ATDD-115`); a contract
  outside the current slice is deferred with `-- x-qfai-status: planned`, not left uncovered.
- Validation passes: `npx qfai validate --profile atdd --fail-on error`.
- Repository quality gates (format/lint/type/tests/pack) pass with evidence.
- Evidence file exists and includes work orders + reviewer notes.
- Every ledger row this cycle advanced carries one of the three RED-provenance forms — an observed RED pair with its `Oracle proof`, the `Satisfied-by` + falsifiability trio, or a `DR-*` recording why neither was available — and `qa-gatekeeper` has accepted it. The third form is a valid _branch_, and it is **not a completion**: `exception` is a blocking output and needs a user-approved `TDDLIST-001` waiver, or the row is parked and the spec stays open (`references/red-provenance.md#branch-3-does-not-close-a-spec-on-its-own`).
- Completion is approved by a reviewer who did not implement tests.

## Not-done criteria

- Any required `US` / `TC` / `CON-API` remains uncovered.
- Forbidden references remain.
- Tests exist but were never executed.
- Validation evidence is missing or failing.
- Coverage Depth Matrix is missing or contains unjustified ❌ cells (normal-path-only coverage is incomplete).
- A ledger row was advanced past `todo` with none of the three forms — no observed RED, no falsifiability evidence, and no `DR-*`.
- A row was sent to `exception` without a `DR-*` recording why **both** branches were unavailable. "The surface was built earlier in this cycle" is not such a reason.

## Failure handling (mandatory)

- If blocked/unknown, stop and raise a Decision Record.
- Do not declare completion when any gate is FAIL; iterate until PASS.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/atdd-<spec-id>.md`

Required sections: the template below is the list. Two of them carry a contract
the heading cannot:

- **Ledger rows advanced** — an index table plus one `### TDD-NNNN` section per
  row. Exactly one form per row, never both and never neither; the cell is an
  anchor and the payload goes in the section
  (`references/red-provenance.md#evidence-shape`).
- **Coverage Depth Matrix** — a link to
  `.qfai/evidence/coverage-depth-<spec-id>.md` and the `✅`/`⚠️`/`❌` totals.
  The matrix and its per-`❌` justifications live in that committed file;
  restating them here would lose them.

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

## Execution logs

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
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
- P1b: **A branch is chosen for every row**, provisionally until its handoff.
- P1c: **A branch 1 row is discharged in that loop** — write the test, take the
  RED, `qa-gatekeeper` PASS, hand it to `/qfai-implement`, GREEN, checkpoint —
  before the next branch-1 row's failing test is written, and before P2-P4 build
  any surface. One loop per `TDD-ID`; the nested run is an item cycle, not a
  completion gate (`references/red-provenance.md#what-the-nested-run-owes`).
- P1d: **Branch 3 rows are handed over once their `DR-*` is written.** Every
  branch needs a handoff — `/qfai-implement` is the only writer of `Status` /
  `DR-ID` / `Evidence`. Which branch goes when, and what the blocking
  `qa-gatekeeper` can judge at each point:
  `references/red-provenance.md#which-stage-hands-a-row-over`.
- P2: E2E implementation completed.
- P3: API implementation completed.
- P4: Integration implementation completed.
- P4b: **Branch 2 rows are handed over**, after P4 and before P6 — their
  mutation needs the surface P2-P4 build, and the trio it produces is the row's
  RED payload.
- P5: Validation gate passed.
- P6: Runtime evidence captured.
- P7: Repo quality gates passed.
- P8: Reviewer confirms completion.

## Completion Criteria (Final Gate)

Before declaring completion:

1. Confirm required `US` / `TC` / `CON-API` coverage is complete.
2. Run:

   ```bash
   npx qfai validate --profile atdd --fail-on error
   ```

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
- Gate results (PASS/FAIL)

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
- [ ] Open questions were logged to the proper OQ file (if applicable).
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

A skill MAY narrow the auto-decide bucket (drop entries) but MUST NOT widen it. Widening triggers a Reviewer-Gate finding.

project_memory:

- Coverage obligations stay layer-pinned for US and CON-API: tests/e2e/** must cover all required US; tests/api/\*\* all required CON-API. Each TC declaring L3/L4/L5, or no Level, is covered from the directory that Level routes to (L3/Integration -> tests/integration/**, L4/API -> tests/api/\*\*, L5/E2E -> tests/e2e/\*\*; no declared Level -> tests/integration/\*\*). L1/Unit and L2/Component owe no ATDD annotation — tdd/test-list.md covers them. An existing one in tests/integration/\*\* is neither counted nor flagged, so do not require adding or removing it.
- Forbidden references guard the test-layer policy: a TC annotation outside its declared home is rejected — tests/api/** must not carry QFAI:SPEC-XXXX:TC-YYYY unless that TC declares L4/API, and tests/e2e/** likewise unless it declares L5/E2E.
- Floor / ratio signals are planning hints, never gates; legacy scenario.feature / coverage ledger files remain optional inputs.
