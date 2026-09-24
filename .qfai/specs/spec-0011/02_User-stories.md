# 02 User Stories

## US Catalog

- US-0011-0001: TDD Micro-Cycle Execution
- US-0011-0002: Forward-Only Status Lifecycle
- US-0011-0003: QA Gatekeeper Confirmation
- US-0011-0004: Exception Handling with DR-ID
- US-0011-0005: Parallel Slice Dispatch
- US-0011-0006: Item Completion Gate
- US-0011-0007: Simplified Handoff Schema
- US-0011-0008: Design System As Input
- US-0011-0009: Implement as a stage of a run
- US-0011-0010: Diagnose a reported defect without changing product code
- US-0011-0011: Fix a regression an existing correct test catches, leaving the `done` row `done`
- US-0011-0012: Fix a defective unit-layer test with ledger status untouched

## US-0011-0001: TDD Micro-Cycle Execution

As a developer, I want `/qfai-implement` to execute the full TDD micro-cycle (Red -> Green -> Refactor -> Done) one test at a time from `test-list.md`, so that production code is test-driven and traceable.

## US-0011-0002: Forward-Only Status Lifecycle

As a QA engineer, I want backward status transitions (e.g., green -> red) to be prohibited, so that TDD discipline is enforced and progress is monotonic.

## US-0011-0003: QA Gatekeeper Confirmation

As a project lead, I want RED/GREEN observations confirmed exclusively by the qa-gatekeeper (not self-certified by implementation workers), so that test-first discipline is independently verified.

## US-0011-0004: Exception Handling with DR-ID

As a developer, I want `exception` status to require a DR-ID in the ledger, so that anomalies are traceable to Decision Records.

## US-0011-0005: Parallel Slice Dispatch

As a developer, I want parallel execution authorized only for independent SUT slices with worktree separation and post-merge integration verify, so that parallel TDD does not introduce hidden coupling.

## US-0011-0006: Item Completion Gate

As a QA engineer, I want a 10-point completion gate for each TDD item, so that no item is marked `done` without full TDD cycle evidence and reviewer approval.

## US-0011-0007: Simplified Handoff Schema

As an implementation worker, I want `prototype-handoff.yaml` to expose only the simplified field set `{finalIterIndex, finalArtifact, extractedDesignSystem, implementationNotes}`, so that legacy `mustPreserve`/`mayAdapt`/`mustNotCopy` triplets stop leaking into the implement skill's input contract.

## US-0011-0008: Design System As Input

As an implementation worker, I want `design-system.yaml` consumed as a deterministic input mirror of DESIGN.md tokens (not a per-iteration HTML extraction), so that downstream UI work always reads a single, validated token surface.

## US-0011-0009: Implement as a stage of a run

- Parent: CAP-0011
- Source: discussion-20260923171450572#DUS-001
- Goal: As an operator who asked for a feature once, I want `/qfai-implement` to
  take its work order from the run, work only the ledger rows the order binds and
  resume where a long stage stopped, so that the run reaches verification without
  my confirming the spec or typing a stage.
- Non-goals: deciding the plan; seeding a ledger row; judging whether the run is
  complete.
- Notes: the implement side of the pack story, with the seam-only work order the
  acceptance stage asks for.

## US-0011-0010: Diagnose a reported defect without changing product code

- Parent: CAP-0011
- Source: discussion-20260923171450572#DUS-002
- Goal: As an operator reporting a defect against behaviour the spec already
  states, I want `/qfai-implement` to reproduce it and name its cause without
  changing any code, so that the run picks the right repair from one verdict.
- Non-goals: repairing anything; appending the missing-test row, which
  `/qfai-sdd` does; choosing the plan branch a verdict leads to.

## US-0011-0011: Fix a regression an existing correct test catches, leaving the `done` row `done`

- Parent: CAP-0011
- Source: discussion-20260923171450572#REQ-0046
- Goal: As an operator whose correct, existing test now fails on a `done` row, I
  want `/qfai-implement` to fix the production code against that row, so that the
  row stays `done` and nothing claims its obligation changed.
- Non-goals: reopening the row; filing a Change Request; appending a new row.
- Notes: the pack has no story for this branch, so the source is the pack
  requirement (DR-0011-0004).

## US-0011-0012: Fix a defective unit-layer test with ledger status untouched

- Parent: CAP-0011
- Source: discussion-20260923171450572#DUS-003
- Goal: As an operator whose bug report traces to a broken `Unit`, `Component` or
  all-`L1`/`L2` `Integration` test, I want `/qfai-implement` to fix that test
  without moving its ledger row, so that the record still says what the
  obligation is.
- Non-goals: fixing an acceptance-layer test, which `/qfai-atdd` does; changing
  what the test expects.
- Notes: the unit-layer half of the pack story (DR-0011-0003).
