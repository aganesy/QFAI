# 02 User Stories

## US Catalog

- US-0011-0001: TDD Micro-Cycle Execution
- US-0011-0003: QA Gatekeeper Confirmation
- US-0011-0005: Parallel Slice Dispatch
- US-0011-0006: Item Completion Gate
- US-0011-0007: Simplified Handoff Schema
- US-0011-0008: Design System As Input

## US-0011-0001: TDD Micro-Cycle Execution

As a developer, I want `/qfai-implement` to execute the full TDD micro-cycle (Red -> Green -> Refactor -> Done) one test at a time from `test-list.md`, so that production code is test-driven and traceable. On the story tree, I want it to take one test at a time, the next being the example (EX) with the lowest ID that no test annotates, and to write that test carrying `QFAI:EX-NNNN-NNNN-NN`, so that the next test is read from the tests themselves rather than from a ledger.

## US-0011-0003: QA Gatekeeper Confirmation

As a project lead, I want RED/GREEN observations confirmed exclusively by the qa-gatekeeper (not self-certified by implementation workers), so that test-first discipline is independently verified.

## US-0011-0005: Parallel Slice Dispatch

As a developer, I want parallel execution authorized only for independent SUT slices with worktree separation and post-merge integration verify, so that parallel TDD does not introduce hidden coupling.

## US-0011-0006: Item Completion Gate

As a QA engineer, I want a 10-point completion gate for each TDD item, so that no item is marked `done` without full TDD cycle evidence and reviewer approval. On the story tree, I want the scoped validate gate to run per business flow (`--flow BF-NNNN`), so that a run is judged on the flow it owns.

## US-0011-0007: Simplified Handoff Schema

As an implementation worker, I want to read the current DCON-008 `prototype-handoff.yaml` contract, including its image-source provenance, so that I receive the final artifact and deterministic design-system input without relying on the retired `mustPreserve`/`mayAdapt`/`mustNotCopy` triplets.

## US-0011-0008: Design System As Input

As an implementation worker, I want `design-system.yaml` consumed as a deterministic input mirror of DESIGN.md tokens (not a per-iteration HTML extraction), so that downstream UI work always reads a single, validated token surface.
