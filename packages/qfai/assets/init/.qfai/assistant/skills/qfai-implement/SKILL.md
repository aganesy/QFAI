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
- When all items are `done`, report "nothing to do" and exit.

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

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` tracks progress with these required columns:

| Column    | Description                                              |
| --------- | -------------------------------------------------------- |
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-0001)      |
| TC-Refs   | References to test cases from `06_Test-Cases.md`         |
| Layer     | Test layer (Unit, Integration, etc.)                     |
| Test file | Path to the test file                                    |
| Selector  | Test selector/description for targeted execution         |
| Status    | Current lifecycle status                                 |
| DR-ID     | Decision Record ID for exception items (blank otherwise) |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle     |

### Status Lifecycle

Valid status values: `todo`, `red`, `green`, `refactor`, `done`, `exception`.

Allowed transitions:

- `todo` -> `red` (write a failing test)
- `red` -> `green` (make the test pass with minimal code)
- `green` -> `refactor` (improve code quality while keeping tests green)
- `refactor` -> `done` (item complete)
- Any active status -> `exception` (anomaly detected; record DR-ID in DR-ID column)
- `exception` -> `todo` (anomaly resolved; the item re-enters the cycle from the
  start). This is the exit `exception` previously lacked; without it a parked
  item could never be un-parked without a lifecycle violation.

Backward transitions are prohibited. Attempting `green` -> `red` must produce:
`"Backward transition prohibited: green -> red"`.

### Exception Handling

`exception` means **anomaly, work paused** — not "accepted risk, closed". The two
are different states sharing one status today; the `DR-ID` distinguishes them and
only the accepted-risk form is completion-satisfying. Resolve a paused item via `exception -> todo`.

Every `exception` row raises `TDDLIST_EXCEPTION_PARKED` (warning, rule
`TDDLIST-001`). The validator cannot read the DR to tell a paused defect from
an approved accepted risk, so the approval is recorded where QFAI already
checks approvals: a `TDDLIST-001` waiver in `.qfai/waivers.yml` (`id` / `reason` /
`expires` / `evidence` / `scope.paths`, plus `match.dl_ids` listing the approved
rows' `TDD-ID`s — omit it and `QFAI-WAIVER-005` rejects the waiver, because one
path-scoped entry would clear every parked row in the same ledger). Without a matching waiver the warning stands, which is the intended signal.

When transitioning to `exception`:

- A DR-ID (Decision Record ID) must be recorded in the DR-ID column.
- If the DR-ID column is empty, emit error: `"exception status requires DR-ID in DR-ID column"`.

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
5. After all routed blocking reviewers return PASS, run checkpoint verification, then transition to `done`.

### Completion

1. After processing all items, update `test-list.md` with final statuses.
2. If all items are `done`, report "All items complete".
3. If some items are `exception`, report them as **blocking output**, not as an
   informational list: for each, the `TDD-ID`, the `DR-ID`, and whether that DR
   is a user-approved accepted-risk waiver. Completion cannot be declared while
   any `exception` row lacks such a waiver.

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
  - reads `test-list.md`, selects the next pending item, enforces Red-Green-Refactor ordering, and is the sole authority for parallel dispatch decisions
- `frontend-engineer` / `backend-engineer`
  - implement the selected item only, write the failing test first, write minimal passing code, and refactor without unrelated changes
- `qa-gatekeeper`
  - is the sole authority for validating RED/GREEN observation evidence and completion gate evidence
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

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE)` column, reviewer response `Result: PASS | REVISE`).

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer response must include `Result: PASS | REVISE` (matching shared-skill-delegation-baseline.md#reviewer-response-template).
- Reviewer checks Drift Protocol compliance and alignment with `.qfai/assistant/catalog/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

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
11. Checkpoint verification passed

### Spec completion conditions

The skill may declare "this spec's implementation is complete" only when:

- All TC-\* from `06_Test-Cases.md` with applicable layer are present in `test-list.md`
- Each item reached `done` or valid `exception` (with DR-ID)
- 0 blocking reviewer issues remain
- Checkpoint verification passed
- No unresolved Change Request or waiver dependency exists

### Completion prohibition conditions

Completion MUST NOT be declared when any of the following are true:

- No RED fresh evidence exists for the item
- No GREEN fresh evidence exists for the item
- Either reviewer (`completion-reviewer` or `implementation-reviewer`) has not been run or returned FAIL
- Items with `todo`, `red`, `green`, or `refactor` status still exist (for spec-level completion)
- Items with `exception` status still exist, **unless** the row's `DR-ID` names
  a Decision Record explicitly recorded as a **user-approved accepted-risk
  waiver** (a `TDDLIST-001` entry in `.qfai/waivers.yml`). An `exception` whose
  DR only describes the anomaly is a parked defect, not a completed item.
- Parallel slices were used but integration verify has not been run post-merge
- Checkpoint boundary was reached but verification was not executed
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

### Evidence hard rules

- Status-only evidence (e.g., "Status: PASS" with no command) is invalid and MUST be rejected
- Both command and result are required; "should pass" or "looks good" alone is not acceptable
- Stale evidence from a previous run MUST NOT be reused to claim completion for a new cycle
- Empty evidence entries are rejected: minimum evidence per TDD item must be met

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Each item was processed one test at a time.
- [ ] Red phase: test was written and confirmed to fail.
- [ ] Green phase: minimal code was written and test confirmed to pass.
- [ ] Refactor phase: code improved with tests still passing.
- [ ] `test-list.md` statuses are accurate.
- [ ] No backward transitions occurred.
- [ ] Exception items have DR-IDs recorded.
- [ ] All tests pass.
- [ ] `qfai validate --profile tdd --fail-on error` passes with zero `QFAI-TEST-001` findings (no `it.todo` / `test.todo` / `describe.todo` stubs remain).

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
