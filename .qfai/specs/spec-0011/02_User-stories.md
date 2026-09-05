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
