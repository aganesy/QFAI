# 06 Test Cases

## TC-0011-0001: Full TDD Cycle Completion

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0001
- Verify that an item transitions through all phases with evidence at each step.

## TC-0011-0002: Backward Transition Produces Error

- EX-Ref: EX-0011-0002
- AC-Refs: AC-0011-0002
- Verify that green -> red transition produces the expected error message.

## TC-0011-0003: RedGreenAuditor Authority

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0003
- Verify that only RedGreenAuditor confirms RED/GREEN observations.

## TC-0011-0004: Exception Missing DR-ID Error

- EX-Ref: EX-0011-0003
- AC-Refs: AC-0011-0004
- Verify that exception without DR-ID produces the expected error.

## TC-0011-0005: Parallel Dispatch Deny Conditions

- EX-Ref: EX-0011-0005
- AC-Refs: AC-0011-0005
- Verify that shared fixtures/mocks block parallel dispatch.

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
