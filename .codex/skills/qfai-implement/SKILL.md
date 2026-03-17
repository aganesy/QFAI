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

| Column    | Description                                      |
|-----------|--------------------------------------------------|
| TDD-ID    | Unique identifier for the TDD item (e.g., TDD-001) |
| TC-Refs   | References to test cases from `06_Test-Cases.md` |
| Layer     | Test layer (Unit, Integration, etc.)             |
| Test file | Path to the test file                            |
| Selector  | Test selector/description for targeted execution |
| Status    | Current lifecycle status                         |

### Status Lifecycle

Valid status values: `todo`, `red`, `green`, `refactor`, `done`, `exception`.

Allowed transitions:
- `todo` -> `red` (write a failing test)
- `red` -> `green` (make the test pass with minimal code)
- `green` -> `refactor` (improve code quality while keeping tests green)
- `refactor` -> `done` (item complete)
- Any active status -> `exception` (anomaly detected; requires DR-ID in Notes)

Backward transitions are prohibited. Attempting `green` -> `red` must produce:
`"Backward transition prohibited: green -> red"`.

### Exception Handling

When transitioning to `exception`:
- A DR-ID (Decision Record ID) must be recorded in the Notes column.
- If Notes is empty, emit warning: `"exception status requires DR-ID in Notes column"`.

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
3. Transition status to `refactor`, then immediately to `done`.

### Completion

1. After processing all items, update `test-list.md` with final statuses.
2. If all items are `done`, report "All items complete".
3. If some items are `exception`, report them with their DR-IDs.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator reads `test-list.md`, determines the next pending item, and delegates each TDD phase.
- Orchestrator MUST NOT write test or production code directly.
- Orchestrator updates `test-list.md` status after each phase completes.

### Sub-agent Roles

| Role         | Responsibility                                    |
|--------------|---------------------------------------------------|
| TestWriter   | Writes the failing test (Red phase)               |
| Implementer  | Writes minimal production code (Green phase)      |
| Refactorer   | Improves code quality (Refactor phase)            |
| TestRunner   | Executes tests and reports pass/fail results      |

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Parallelization Policy

- **Default**: Serial execution. Items are processed one at a time in `test-list.md` order.
- **Exception**: When items target completely independent SUT modules with no shared state, parallel processing may be used with explicit user approval.
- Serial execution ensures that each test is written and verified in isolation before moving to the next.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- All `todo` items in `test-list.md` have been processed.
- Each processed item reached `done` or `exception` status.
- All tests pass (`npm test` or equivalent).
- `test-list.md` reflects the final state accurately.
- Exception items have DR-IDs recorded in Notes.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/implement-spec-XXXX.md`

Required sections:

- Objective
- Items processed (TDD-ID, TC-Refs, final status)
- Test results summary
- Exception items (if any) with DR-IDs
- Commands executed

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Each item was processed one test at a time.
- [ ] Red phase: test was written and confirmed to fail.
- [ ] Green phase: minimal code was written and test confirmed to pass.
- [ ] Refactor phase: code improved with tests still passing.
- [ ] `test-list.md` statuses are accurate.
- [ ] No backward transitions occurred.
- [ ] Exception items have DR-IDs in Notes.
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
