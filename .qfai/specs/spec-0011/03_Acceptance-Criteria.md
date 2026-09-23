# 03 Acceptance Criteria

## AC-0011-0001: TDD Cycle Completeness

Given a `todo` item in test-list.md, when `/qfai-implement` processes it, then it transitions through `red` -> `green` -> `refactor` -> `done` with evidence at each phase.

## AC-0011-0002: Backward Transition Rejection

Given an item with status `green`, when a transition to `red` is attempted, then the system produces error: "Backward transition prohibited: green -> red".

## AC-0011-0003: QA Gatekeeper Sole Authority

Given a RED observation by an implementation worker, when confirmation is needed, then only qa-gatekeeper may confirm the observation; self-certification is rejected.

## AC-0011-0004: Exception Requires DR-ID

Given an item transitioning to `exception`, when DR-ID column is empty, then error: "exception status requires DR-ID in DR-ID column".

## AC-0011-0005: Parallel Dispatch Authorization

Given a request for parallel execution, when delivery-planner evaluates, then it authorizes only when all allow conditions are met and no deny conditions exist.

## AC-0011-0006: 10-Point Gate Enforcement

Given a TDD item, when checking for `done` transition, then all 10 checklist points are verified including test-first, RED/GREEN auditor confirmation, both reviewer PASS, and checkpoint verification.

## AC-0011-0007: Fresh Evidence Required

Given a TDD item, when evidence is checked, then both RED and GREEN evidence include exact command + result; status-only evidence is rejected.

## AC-0011-0008: Completed Items Skipped

Given a test-list.md with all items `done`, when `/qfai-implement` runs, then it reports "nothing to do" and exits.

## AC-0011-0009: Simplified Handoff Schema

Given a finalized `prototype-handoff.yaml`, when `/qfai-implement` parses it, then only `finalIterIndex` (number), `finalArtifact` (path), `extractedDesignSystem` (path), and `implementationNotes` (string) fields are read. Legacy fields `mustPreserve`, `mayAdapt`, `mustNotCopy` are absent; their presence triggers a schema warning and is ignored.

## AC-0011-0010: Design System As Deterministic DESIGN.md Mirror

Given `extractedDesignSystem` resolves to `.qfai/contracts/design/design-system.yaml`, when `/qfai-implement` reads token tables, then those tables are byte-equivalent to the parsed token tables of root `DESIGN.md` (color / typography / radius / shadow). The mirror invariant is enforced at validate time by the design contract validators owned by spec-0004.

## AC-0011-0011: Minimal Code In Phase Green

Given a failing test, when Phase Green writes production code for it, then the code written is the least that makes that test pass, and behaviour no test yet demands is not generalized ahead of its own RED.

## AC-0011-0012: Records Go To Existing Homes

- Source: discussion-20260923060900824#REQ-0007

Given the shipped `/qfai-implement` skill (`SKILL.md` and `references/**`), when it tells an agent where a stop, a decision, a consultation or an out-of-scope discovery is recorded, then a stop is recorded in the row's `Blocked-By`, which names what it waits on; a decision, a consultation and an out-of-scope discovery go to `/qfai-sdd` as a Change Request, which records them in the spec's `07_Decisions.md` or `08_Open-questions.md`; and no file of the skill names `.qfai/steering/` or `worklog-entry.schema.md`.
