---
name: qfai-implement
title: QFAI Implement (Unified TDD Micro-cycle)
description: "Unified implementation skill that orchestrates the full TDD micro-cycle (Red/Green/Refactor) one test at a time using test-list.md as the execution ledger."
argument-hint: "[spec-id]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent]
roles:
  [
    orchestrator,
    delivery-planner,
    test-design-analyst,
    frontend-engineer,
    backend-engineer,
    acceptance-test-engineer,
    implementation-reviewer,
    qa-gatekeeper,
    completion-reviewer,
    product-surface-reviewer,
  ]
routing-profile: runtime-heavy
mode: approval-gated
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-implement - Unified TDD Micro-cycle

[DRIFT-PROTOCOL:MANDATORY]

## Spec Auto-Discovery Protocol

When no explicit argument is given, detect the candidate spec and constrain execution to one spec only. Auto-discovery selects at most one spec; this protocol does NOT enable multi-spec parallel execution.

### User Selection Flow

- Single spec: announce the detected spec; ask for confirmation when scope is ambiguous.
- Multiple specs: display the candidates and require the user to choose one spec.
- Zero specs: stop and ask the user to provide the target spec explicitly.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- exception handling
- scope confirmation

## CRITICAL CONSTRAINTS (Read First)

- This skill processes **one test at a time** from `test-list.md`.
- Each item goes through the full TDD micro-cycle: write a **failing test** first, then make it pass, then refactor.
- The execution ledger is located at `.qfai/specs/<spec-id>/tdd/test-list.md`.
- Items are processed **serially** by default. Parallel processing is allowed only when items target independent SUT slices with no shared state.
- Status transitions follow a strict forward-only lifecycle: `todo` -> `red` -> `green` -> `refactor` -> `done`.
- The `exception` status can be reached from any active status when an anomaly is detected.
- Backward transitions are prohibited (e.g., `green` -> `red` is not allowed).
- Completed items (`done`) are skipped on re-execution.
- When every item is terminal (`done` or a valid `exception`) the per-item work is finished, but the
  **spec-level checkpoint boundary** may still be owed — an interrupted run, or a re-run of an
  already-terminal ledger, leaves it unrecorded. Before reporting "nothing to do" and exiting,
  confirm fresh spec-level checkpoint verification evidence exists for this ledger state; run the
  per-spec verification first when it is missing or stale. See
  `references/checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger`.

## Goal

Execute the TDD micro-cycle for each pending item in `test-list.md`, transitioning each through Red -> Green -> Refactor -> Done, producing tested production code aligned with the spec.

## Visual Review Guard

- Review rendered output, screenshot evidence, or HTML output before closing any UI-affecting item.
- Read spec + contract inputs first whenever implementation touches UI or critique-driven behavior. Read order: `01_Spec.md` → `03_Acceptance-Criteria.md` → `05_Examples.md` → root `DESIGN.md` → `.qfai/contracts/design/DESIGN.md.lock.yaml` → `.qfai/contracts/design/design-system.yaml` (post-loop token mirror) → `.qfai/contracts/design/prototype-handoff.yaml` → `.qfai/contracts/ui/*.yaml` → `.qfai/evidence/prototyping/iter-NN/<screen>.{png,html}` → `.qfai/prototypes/final/index.html`.
- Do not read discussion-pack UI/UX sidecars or fallback mocks.
- Prototype HTML is analysis input, not production source. Reimplement with project-native patterns while preserving the visual identity captured in `prototype-handoff.yaml` `implementationNotes` (free-form prose).
- UI-affecting items require product-surface-reviewer prototype parity review before `done`. If code intent and rendered output diverge, treat the rendered/HTML result as the blocking review input and reconcile before DONE.

## Non-goals

- Writing spec artifacts (use `/qfai-sdd`).
- Writing acceptance tests (use `/qfai-atdd`).
- Running validation gates (use `/qfai-verify`).
- Parallel execution across multiple specs simultaneously.

## Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what this
skill has done and may still do. Status values are `todo`, `red`, `green`, `refactor`, `done`,
`exception`; the lifecycle is forward-only and an `exception` requires a DR-ID.

The eight required columns, the allowed transitions and the exception rules are in
`references/execution-ledger.md`. Read it before writing to the ledger.

## Required Process

### Phase: Red (Write Failing Test)

1. Read `test-list.md` and select the first item with `Status = todo`.
2. Transition status to `red`.
3. Write a **failing test** based on the TC-Refs specification.
4. Run the test and **watch it fail** — confirm the test actually fails for the expected reason.
5. If the test unexpectedly passes, transition to `exception` and record the anomaly.

### Phase: Green (Make It Pass)

1. Write the **minimum production code** to make the failing test pass.
2. Run the test and **watch it pass**.
3. Transition status to `green`.
4. If the test still fails after implementation, investigate and fix. Do not skip to refactor.

### Phase: Refactor

1. Improve code quality (naming, structure, duplication removal) while keeping all tests green.
2. Run the full relevant test suite to confirm nothing broke.
3. Transition status to `refactor`.
4. Submit for completion review (`completion-reviewer`) and code quality review (`implementation-reviewer`).
5. After all routed blocking reviewers return PASS, run checkpoint verification (see `#checkpoint-verification`), then transition to `done`.

### Completion

1. After processing all items, update `test-list.md` with final statuses.
2. If all items are `done`, report "All items complete".
3. If some items are `exception`, report them with their DR-IDs.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- Orchestrator MUST NOT write test or production code directly; delegate every TDD phase to the routed implementation agents.
- Additional implement-specific overrides:
  - read `test-list.md`, determine the next pending item, and delegate each TDD phase;
  - update `test-list.md` status after each phase completes.

### Formal Sub-agent Roster

This skill delegates through the centralized routing policy in `.qfai/assistant/manifest/agent-routing.yml`.

- `delivery-planner`
  - reads `test-list.md`, selects the next pending item, and is the sole authority for **item selection and item scope** — whether this row's selector is a sufficient slice of its `TC-*` obligation
  - enforces Red-Green-Refactor **ordering** (which phase may run next), not the RED/GREEN observation itself
  - is the sole authority for parallel dispatch decisions
- `frontend-engineer` / `backend-engineer`
  - implement the selected item only, write the failing test first, write minimal passing code, and refactor without unrelated changes
- `qa-gatekeeper`
  - is the sole authority for validating **RED/GREEN observation evidence** — did the test fail (or pass) for the expected reason — and completion gate evidence
  - does not adjudicate item scope; a scope objection is `delivery-planner`'s call
- `implementation-reviewer`
  - reviews code quality, maintainability, backend correctness, and hidden coupling
- `completion-reviewer`
  - verifies spec alignment, drift-protocol compliance, and final DoD
- `product-surface-reviewer`
  - reviews UI-affecting implementation when the item changes surface behavior

### Handoff Contracts

All agent-to-agent transitions follow these contracts:

1. `delivery-planner` selects the next item and assigns it to the appropriate implementation agent.
2. Implementation agent submits RED/GREEN execution evidence to `qa-gatekeeper`.
3. `qa-gatekeeper` confirms or rejects the RED/GREEN observation.
4. After GREEN, implementation agent submits the item to `completion-reviewer` for spec alignment and to `implementation-reviewer` for code quality review.
5. `product-surface-reviewer` is added when the item affects UI behavior or rendered output.
6. Only after all routed blocking reviewers pass may the item transition to `done`.

#### Precedence between `delivery-planner` and `qa-gatekeeper`

The two roles answer different questions and are ordered, not concurrent:

- `delivery-planner` answers _is this item's scope sufficient to be the whole of its `TC-*` obligation_.
- `qa-gatekeeper` answers _did the test fail (or pass) for the expected reason_.

Precedence rules:

- A `delivery-planner` REVISE on item scope MUST be resolved **before** RED evidence is submitted to `qa-gatekeeper` (step 2). Do not run step 2 while a scope REVISE is open.
- Once `qa-gatekeeper` PASSes the observation for a RED round, item scope MUST NOT be re-litigated for that round. A newly discovered scope gap opens a **new** `test-list.md` row rather than reopening the passed one.
- If a scope objection nonetheless arrives after step 3, it is treated as a new-row request; the existing PASS stands and is not discarded.
- Neither role may overrule the other inside the other's domain: a `qa-gatekeeper` PASS never widens item scope, and a `delivery-planner` verdict never substitutes for RED/GREEN observation evidence.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE/PENDING)` column, reviewer response `Result: PASS | REVISE`).

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer response must include `Result: PASS | REVISE` (matching shared-skill-delegation-baseline.md#reviewer-response-template).
- Reviewer checks Drift Protocol compliance and alignment with `.qfai/assistant/catalog/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

#### Blocking vs advisory findings

Follow `shared-skill-delegation-baseline.md#finding-provenance-must`.

- A **blocking** finding cites either an upstream obligation (`AC-*`, `BR-*`, `TC-*`, `CON-*`, or
  a named constitution/catalog rule) or a defect class (`defect:correctness`, `defect:security`,
  `defect:code-quality`) in its `Traces to:` field. A defect demonstrable from the changed code —
  an unhandled rejection, a missing validation on trusted input, a leak, a broken contract the
  code itself declares — is blocking without needing an `AC-*`. Only blocking findings force
  `REVISE` and only blocking findings hold the item out of `done`.
- An **advisory** finding is one whose `Traces to:` is `none` — a new product obligation upstream
  never asked for. It MUST NOT be implemented as production code or pinned as a test assertion.
  Route it per `drift-protocol.md#reviewer-originated-obligations`: record it in the reviewer
  response under `Advisory / Change Request proposals`. Do **not** edit `08_Open-questions.md`
  here — it is upstream SSOT under the Drift Protocol and creating spec artifacts is a non-goal of
  this skill; the owner phase (`/qfai-sdd`) records and adjudicates it.
- A new advisory that does not change an already-approved obligation leaves the item free to reach
  `done`. One that **does** change an approved obligation takes the Change Request path, and
  `drift-protocol.md#when-drift-is-detected` applies: STOP, and no `done` for items depending on
  the obligation under dispute until approval and the owner rerun.
- `Do not declare DONE until Reviewer returns PASS` is never waived: the Reviewer verdict is
  required on every item, including one whose review produced only advisories. What **blocking**
  findings change is the verdict itself — only they force `REVISE` and hold `done`. An
  advisory-only review returns `PASS`, and that `PASS` is still what releases `done`.

## Parallelization Policy

- **Default**: Serial execution. Items are processed one test at a time in `test-list.md` order.
- **Exception**: When items target completely independent SUT modules with no shared state, parallel processing may be used with explicit user approval.
- Serial execution ensures that each test is written and verified in isolation before moving to the next.
- `delivery-planner` is the sole authority for authorizing parallel dispatch.

### Allow conditions (all must be true)

- Independent SUT (no shared source files under test)
- Independent test files (no shared test files or fixtures)
- No shared state (no shared database, global variable, singleton, or DI container)
- No sequential dependency (Slice B does not depend on Slice A output)
- Worktree or branch separation is available
- Post-merge integration verify plan exists

### Deny conditions (any one blocks parallel dispatch)

- Same behavior Red/Green/Refactor cycle across slices
- Same public API surface modified by multiple slices
- Shared fixture, shared mock, shared DI container, shared global setup
- Sequential dependency: "A must finish before B has meaning"
- Independence claim cannot be explained with concrete file/module evidence

### Post-parallel integration verify

- After parallel slices complete and merge, run integration verify on the merged result
- If integration verify fails, flag all slices for re-examination and roll back the merge
- If integration verify passes, state transitions back to `delivery-planner` for sequential flow

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

### Item completion checklist (11-point gate)

An item in `test-list.md` may transition to `done` only when ALL of the following are satisfied:

1. Corresponding `TDD-ID` has been selected and is in progress
2. A failing test was added first (test-first)
3. RED was observed — `qa-gatekeeper` confirmed the test failed for the expected reason (watch it fail)
4. Minimal production code was written to make the test pass
5. GREEN was observed — `qa-gatekeeper` confirmed the test passes after implementation (watch it pass)
6. Refactor was performed and GREEN was re-confirmed after refactor
7. `completion-reviewer` returned PASS (spec / completion review gate)
8. `implementation-reviewer` returned PASS (code quality review gate)
9. UI-affecting items have prototype parity PASS from `product-surface-reviewer`
10. `test-list.md` Status and Evidence columns are updated with fresh evidence
11. Checkpoint verification passed (see `#checkpoint-verification`)

### Review artifact layout (MUST)

Gate items 7-9 are evidence-bearing: reviewer verdicts must be written to a review pack, not left in
conversation. There is exactly **one** `.qfai/review/**` layout — `review-<17-digit-timestamp>/`
holding `review_request.md`, `R01_<reviewer-id>.md` (at least one) and `summary.json`. Do not nest
`<scope>/<layer>/attempt-NN/` directories: packs written there are invisible to `qfai validate`.
Each review round creates a new pack. Full schema and the `REVISE` -> `status: "FAIL"` mapping:
`references/review-artifact-layout.md`.

### Spec completion conditions

The skill may declare "this spec's implementation is complete" only when:

- All TC-\* from `06_Test-Cases.md` with applicable layer are present in `test-list.md`
- Each item reached `done` or valid `exception` (with DR-ID)
- 0 blocking reviewer issues remain
- Checkpoint verification passed at the spec-level boundary (see `#checkpoint-verification`)
- No unresolved Change Request or waiver dependency exists

### Completion prohibition conditions

Completion MUST NOT be declared when any of the following are true:

- No RED fresh evidence exists for the item
- No GREEN fresh evidence exists for the item
- Either reviewer (`completion-reviewer` or `implementation-reviewer`) has not been run or returned FAIL
- Items with `todo`, `red`, `green`, or `refactor` status still exist (for spec-level completion)
- Parallel slices were used but integration verify has not been run post-merge
- A checkpoint boundary was reached (see `#checkpoint-verification`) but the verification command set was not executed, or any command in it exited non-zero
- `it.todo(...)` / `test.todo(...)` / `describe.todo(...)` stubs remain in any file covered by `validation.traceability.testFileGlobs` (`QFAI-TEST-001`). Implement the body or delete the stub — an opt-out via `validation.testStrategy.forbidTestTodoStubs: false` is permitted only with an accompanying waiver DR-ID.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/implement-<spec-id>.md`

Required sections:

- Objective
- Items processed (TDD-ID, TC-Refs, final status)
- Test results summary
- Exception items (if any) with DR-IDs
- Commands executed

### Per-item evidence contract (fresh evidence required)

Each TDD item MUST have fresh evidence containing at minimum:

- `TDD-ID` — the item identifier
- `TC-ref` — reference to the test case(s)
- `RED command` — the exact command executed to observe failure
- `RED result` — the failure output (result completeness is best-effort; truncated output is acceptable)
- `GREEN command` — the exact command executed to observe success
- `GREEN result` — the success output
- `Refactor verify command` — the exact command re-executed after refactor
- `Refactor verify result` — the output confirming GREEN is maintained
- `Spec review` — completion-reviewer result (PASS or FAIL)
- `Code quality review` — implementation-reviewer result (PASS or FAIL)
- `Prototype parity` — product-surface-reviewer result for UI-affecting items (PASS or REVISE)
- `Checkpoint verification command` — the exact command set executed at the checkpoint boundary
- `Checkpoint verification result` — the outcome of that command set (PASS only when every command exits 0)

### Evidence hard rules

- Status-only evidence (e.g., "Status: PASS" with no command) is invalid and MUST be rejected
- Both command and result are required; "should pass" or "looks good" alone is not acceptable
- Stale evidence from a previous run MUST NOT be reused to claim completion for a new cycle
- Empty evidence entries are rejected: minimum evidence per TDD item must be met

## Checkpoint Verification

"Checkpoint verification" is the whole-repository regression check run at a checkpoint boundary. It
is what item 11 of the 11-point gate refers to and the only thing it refers to. A boundary is
reached **per item** (after all routed blocking reviewers return PASS, before `refactor` -> `done`)
and **per spec** (after the last ledger row is terminal). There is no "every N items" rule.

It PASSES only when **every** command in the verification command set exits 0; a partial run is not
a pass. The boundary definition, command set, pass criteria and evidence fields are in
`references/checkpoint-verification.md`.

## FINAL CHECKLIST (Check Last)

Work through `references/final-checklist.md` immediately before the completion message. Every box
must be ticked; a box that cannot be ticked is a reason not to declare completion.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Verify gates: `/qfai-verify`.
  Action: run `qfai validate --profile tdd --fail-on error` for this skill, then `/qfai-verify` for full-scan approval.
- Spec updates needed: `/qfai-sdd`.
  Action: update spec artifacts if implementation revealed scope changes.
- Acceptance tests: `/qfai-atdd`.
  Action: ensure acceptance test coverage aligns with implementation.

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

- One TDD item at a time from test-list.md; status lifecycle is forward-only (todo → red → green → refactor → done); exception requires DR-ID.
- Fresh RED + GREEN command/result evidence is mandatory per item; status-only evidence (e.g. "Status: PASS") is rejected.
- UI-affecting items require product-surface-reviewer prototype-parity PASS before the item can transition to done.
