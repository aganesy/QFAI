---
name: qfai-implement
title: QFAI Implement (Unified TDD Micro-cycle)
description: "Unified implementation skill that orchestrates the full TDD micro-cycle (Red/Green/Refactor) one test at a time using test-list.md as the execution ledger."
argument-hint: "<spec-id>"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent]
roles: [Implementer, Reviewer]
mode: approval-gated
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-implement - Unified TDD Micro-cycle

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed (e.g., exception handling, scope confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit numbered choices.
  The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
  The reason for unavailability MUST be stated.

## CRITICAL CONSTRAINTS (Read First)

- This skill processes **one test at a time** from `test-list.md`.
- Each item goes through the full TDD micro-cycle: write a **failing test** first, then make it pass, then refactor.
- The execution ledger is located at `.qfai/specs/spec-XXXX/tdd/test-list.md`.
- Items are processed **serially** by default. Parallel processing is allowed only when items target independent SUT slices with no shared state.
- Status transitions follow a strict forward-only lifecycle: `todo` -> `red` -> `green` -> `refactor` -> `done`.
- The `exception` status can be reached from any active status when an anomaly is detected.
- Backward transitions are prohibited (e.g., `green` -> `red` is not allowed).
- Completed items (`done`) are skipped on re-execution.
- When all items are `done`, report "nothing to do" and exit.

## Goal

Execute the TDD micro-cycle for each pending item in `test-list.md`, transitioning each through Red -> Green -> Refactor -> Done, producing tested production code aligned with the spec.

## Non-goals

- Writing spec artifacts (use `/qfai-sdd`).
- Writing acceptance tests (use `/qfai-atdd`).
- Running validation gates (use `/qfai-verify`).
- Parallel execution across multiple specs simultaneously.

## Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/spec-XXXX/tdd/test-list.md` tracks progress with these required columns:

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
- Any active status -> `exception` (anomaly detected; record DR-ID in Notes column if present)

Backward transitions are prohibited. Attempting `green` -> `red` must produce:
`"Backward transition prohibited: green -> red"`.

### Exception Handling

When transitioning to `exception`:

- A DR-ID (Decision Record ID) should be recorded in the Notes column if present.
- If a Notes column exists but is empty, emit warning: `"exception status requires DR-ID in Notes column"`.

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
4. Submit for spec review (TDDSpecReviewer) and code quality review (TDDCodeQualityReviewer).
5. After both reviewers return PASS, run checkpoint verification, then transition to `done`.

### Completion

1. After processing all items, update `test-list.md` with final statuses.
2. If all items are `done`, report "All items complete".
3. If some items are `exception`, report them with their DR-IDs.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator reads `test-list.md`, determines the next pending item, and delegates each TDD phase.
- Orchestrator MUST NOT write test or production code directly.
- Orchestrator updates `test-list.md` status after each phase completes.

### Formal Sub-agent Roster

This skill delegates to 6 named sub-agents. Each has explicit responsibilities, prohibitions, and handoff contracts.
RedGreenAuditor is the sole authority for RED/GREEN observation confirmation;
self-certification by TDDImplementer is prohibited.

#### TDDCycleController

- Responsibilities: reads `test-list.md`, selects the next pending item, enforces Red-Green-Refactor-Review-Checkpoint ordering,
  blocks advancement until completion conditions are met, oversized item splitting (target: completion within minutes)
- Prohibitions: must not write test or production code directly, must not edit spec artifacts, must not authorize parallel dispatch without ParallelSliceDispatcher confirmation of independence

#### TDDImplementer

- Responsibilities: implements the selected single item only — writes a failing test first,
  writes minimal production code to make it pass, performs refactor while keeping tests green, performs local self-inspection before handoff
- Prohibitions: must not write production code before the failing test exists,
  must not confirm its own RED/GREEN observations (self-certification prohibited — only RedGreenAuditor may confirm RED/GREEN observations),
  must not work on more than one item simultaneously, must not perform speculative generalization, must not mix unrelated refactoring

#### RedGreenAuditor

- Responsibilities: sole authority for confirming RED and GREEN observations — verifies that the test actually failed for the expected reason (watch it fail),
  verifies that the test actually passed after implementation (watch it pass), verifies that refactored code maintains green state
- Prohibitions: must not accept reasoning-only confirmation without actual test execution output, must not accept setup failures / import errors / typo failures as valid RED observations

#### TDDSpecReviewer

- Responsibilities: reviews alignment with `01_Spec.md`, `06_Test-Cases.md`, `09_delta.md`, `10_Plan.md` — detects scope creep,
  verifies `test-list.md` updates match spec references, performs spec review as an independent gate
- Prohibitions: must not issue style-only reviews that skip compliance checks, must not permit spec drift through reviewer notes alone while allowing completion

#### TDDCodeQualityReviewer

- Responsibilities: reviews duplication, naming, hidden coupling, edge cases, error boundaries, security assumptions —
  verifies refactor achieves design improvement, performs code quality review as an independent gate
- Prohibitions: must not issue style-nit-only reviews that skip design analysis, must not conflate spec compliance with quality review scope,
  must not be self-approved by TDDImplementer (TDDImplementer cannot serve as TDDCodeQualityReviewer for its own work)

#### ParallelSliceDispatcher

- Responsibilities: sole authority for authorizing parallel dispatch — evaluates independence of candidate slices, requires worktree/branch separation, defines post-merge integration verify conditions
- Prohibitions: must not authorize parallel dispatch for slices sharing the same behavior R/G/R cycle, same API surface, same fixture/mock/DI/global setup, or any unexplained independence claim

### Handoff Contracts

All agent-to-agent transitions follow these 8 defined contracts:

1. **TDDCycleController -> TDDImplementer**: Controller selects item, sets status to `red`, hands off item context (TDD-ID, TC-Refs, spec references) to Implementer
2. **TDDImplementer -> RedGreenAuditor**: Implementer submits RED/GREEN observation
   (test command + actual output: failing for RED, passing for GREEN) for verification; Auditor confirms or rejects the observation state
3. **RedGreenAuditor -> TDDImplementer**: Auditor returns RED/GREEN confirmation
   (RED: proceed to implementation; GREEN: proceed to spec review) or rejection (resubmit with valid and correctly classified test run)
4. **TDDImplementer -> TDDSpecReviewer**: After GREEN confirmed by RedGreenAuditor, Implementer submits item for spec review with implementation summary and test evidence
5. **TDDSpecReviewer -> TDDImplementer**: Reviewer returns PASS (proceed to quality review) or FAIL with required fixes
6. **TDDImplementer -> TDDCodeQualityReviewer**: After spec review PASS, Implementer submits for code quality review
7. **TDDCodeQualityReviewer -> TDDImplementer**: Reviewer returns PASS (item can be marked done) or FAIL with required fixes
8. **TDDCycleController -> ParallelSliceDispatcher**: Controller requests parallel dispatch evaluation; Dispatcher returns authorization or denial with rationale

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | `role`           | `task`     | `refs`       | `refs`        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer checks Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## Parallelization Policy

- **Default**: Serial execution. Items are processed one test at a time in `test-list.md` order.
- **Exception**: When items target completely independent SUT modules with no shared state, parallel processing may be used with explicit user approval.
- Serial execution ensures that each test is written and verified in isolation before moving to the next.
- ParallelSliceDispatcher is the sole authority for authorizing parallel dispatch.

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
- If integration verify passes, state transitions back to TDDCycleController for sequential flow

## Completion Contract (Shared)

### Item completion checklist (10-point gate)

An item in `test-list.md` may transition to `done` only when ALL of the following are satisfied:

1. Corresponding `TDD-ID` has been selected and is in progress
2. A failing test was added first (test-first)
3. RED was observed — RedGreenAuditor confirmed the test failed for the expected reason (watch it fail)
4. Minimal production code was written to make the test pass
5. GREEN was observed — RedGreenAuditor confirmed the test passes after implementation (watch it pass)
6. Refactor was performed and GREEN was re-confirmed after refactor
7. TDDSpecReviewer returned PASS (spec review gate)
8. TDDCodeQualityReviewer returned PASS (code quality review gate)
9. `test-list.md` Status and Evidence columns are updated with fresh evidence
10. Checkpoint verification passed

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
- Either reviewer (TDDSpecReviewer or TDDCodeQualityReviewer) has not been run or returned FAIL
- Items with `todo`, `red`, `green`, or `refactor` status still exist (for spec-level completion)
- Parallel slices were used but integration verify has not been run post-merge
- Checkpoint boundary was reached but verification was not executed

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/implement-spec-XXXX.md`

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
- `Refactor verify` — confirmation that GREEN is maintained after refactor
- `Spec review` — TDDSpecReviewer result (PASS or FAIL)
- `Code quality review` — TDDCodeQualityReviewer result (PASS or FAIL)

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

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Verify gates: `/qfai-verify`.
  Action: run `qfai validate --fail-on error` and confirm all gates pass.
- Spec updates needed: `/qfai-sdd`.
  Action: update spec artifacts if implementation revealed scope changes.
- Acceptance tests: `/qfai-atdd`.
  Action: ensure acceptance test coverage aligns with implementation.
