# 03 Acceptance Criteria

## AC-0011-0001: TDD Cycle Completeness

Given a `todo` item in test-list.md, when `/qfai-implement` processes it, then it transitions through `red` -> `green` -> `refactor` -> `done` with evidence at each phase.

## AC-0011-0002: Backward Transition Rejection

Given an item with status `green`, when a transition to `red` is attempted, then the system produces error: "Backward transition prohibited: green -> red".

## AC-0011-0003: RedGreenAuditor Sole Authority

Given a RED observation by TDDImplementer, when confirmation is needed, then only RedGreenAuditor may confirm the observation; TDDImplementer self-certification is rejected.

## AC-0011-0004: Exception Requires DR-ID

Given an item transitioning to `exception`, when DR-ID column is empty, then error: "exception status requires DR-ID in DR-ID column".

## AC-0011-0005: Parallel Dispatch Authorization

Given a request for parallel execution, when ParallelSliceDispatcher evaluates, then it authorizes only when all allow conditions are met and no deny conditions exist.

## AC-0011-0006: 10-Point Gate Enforcement

Given a TDD item, when checking for `done` transition, then all 10 checklist points are verified including test-first, RED/GREEN auditor confirmation, both reviewer PASS, and checkpoint verification.

## AC-0011-0007: Fresh Evidence Required

Given a TDD item, when evidence is checked, then both RED and GREEN evidence include exact command + result; status-only evidence is rejected.

## AC-0011-0008: Completed Items Skipped

Given a test-list.md with all items `done`, when `/qfai-implement` runs, then it reports "nothing to do" and exits.
