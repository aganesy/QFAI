# 06 Test Cases

## TC-0011-0001: Full TDD Cycle Completion

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0001
- Verify that an item transitions through all phases with evidence at each step.

## TC-0011-0002: Backward Transition Produces Error

- EX-Ref: EX-0011-0002
- AC-Refs: AC-0011-0002
- Verify that green -> red transition produces the expected error message.

## TC-0011-0003: QA Gatekeeper Authority

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0003
- Verify that only qa-gatekeeper confirms RED/GREEN observations.

## TC-0011-0004: Exception Missing DR-ID Error

- EX-Ref: EX-0011-0003
- AC-Refs: AC-0011-0004
- Verify that exception without DR-ID produces the expected error.

## TC-0011-0005: Parallel Dispatch Deny Conditions

- EX-Ref: EX-0011-0005
- AC-Refs: AC-0011-0005
- Verify that writing the same shared fixture/mock file, or mutating the same
  fixture instance, blocks parallel dispatch, while a read-only shared fixture
  module does not.

## TC-0011-0006: 10-Point Gate Enforcement

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0006
- Verify that all 10 checklist points are checked before `done` transition.

## TC-0011-0007: Fresh Evidence Required

- EX-Ref: EX-0011-0004
- AC-Refs: AC-0011-0007
- Verify that stale and status-only evidence is rejected.

## TC-0011-0008: All Done Reports Nothing To Do

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0008
- Verify that re-running implement with all items done produces "nothing to do".

## TC-0011-0009: Minimal Code For The One Failing Test

- EX-Ref: EX-0011-0006
- AC-Refs: AC-0011-0001
- Verify that Phase Green asks for the minimum production code that makes the
  failing test pass, and that it is written after the failure has been watched
  rather than before.

## TC-0011-0010: Reviewer Separation Before `done`

- EX-Ref: EX-0011-0007
- AC-Refs: AC-0011-0006
- Verify that the item is reviewed by `completion-reviewer` and
  `implementation-reviewer`, and that `done` is reachable only once every
  required reviewer has passed.

## TC-0011-0011: Simplified Handoff Schema Parse

- EX-Ref: EX-0011-0008
- AC-Refs: AC-0011-0009
- Verify `/qfai-implement` parses a simplified-only `prototype-handoff.yaml` without errors and that adding a legacy field (`mustPreserve`) emits a schema warning and is otherwise ignored.

## TC-0011-0012: Design System Mirror Byte-Equivalence

- EX-Ref: EX-0011-0009
- AC-Refs: AC-0011-0010
- Verify `/qfai-implement` reads `design-system.yaml` token tables that are byte-equivalent to root `DESIGN.md` token tables after parse normalization, and surfaces drift through the design contract validators.
