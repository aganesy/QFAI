# 05 Examples

## EX-0010-0001: Complete 15-File Pack

- BR-Ref: BR-0010-0001
- Given a discussion run for a web application
- When discussion completes
- Then `.qfai/discussion/discussion-20260401120000000/` contains all 15 files (01..14, 99)

## EX-0010-0002: OQ Resolution to Zero

- BR-Ref: BR-0010-0002
- Given 3 OQs identified during interview, 2 resolved and 1 deferred
- When deferred OQ has complete metadata in `13_Deferred.md`
- Then open count is zero and discussion can complete

## EX-0010-0003: Example Mapping Perspectives

- BR-Ref: BR-0010-0002
- Given BR-0010-0001 (Fixed Output Path)
- When Example Mapping runs with 6 perspectives
- Then happy path, negative path, edge/boundary, permission/role, state transition, and idempotency are each addressed or skipped with reason

## EX-0010-0004: UI-Bearing Sidecar Generation

- BR-Ref: BR-0010-0004
- Given surface type `web-ui` detected
- When discussion completes
- Then all 11 uiux/ files are generated including strategy, scoring axes, anchor, and contracts

## EX-0010-0005: Non-UI Pack Skips Sidecar

- BR-Ref: BR-0010-0004
- Given surface type `non-ui` (CLI tool)
- When discussion completes
- Then no uiux/ directory is created and no DDS validators fire

## EX-0010-0006: Coverage Placeholder for BR-0010-0003

- BR-Ref: BR-0010-0003
- Given the consolidated rule BR-0010-0003
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0003

## EX-0010-0007: Coverage Placeholder for BR-0010-0005

- BR-Ref: BR-0010-0005
- Given the consolidated rule BR-0010-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0005

## EX-0010-0008: Coverage Placeholder for BR-0010-0006

- BR-Ref: BR-0010-0006
- Given the consolidated rule BR-0010-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0006

## EX-0010-0009: Coverage Placeholder for BR-0010-0007

- BR-Ref: BR-0010-0007
- Given the consolidated rule BR-0010-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0007

## EX-0010-0010: Coverage Placeholder for BR-0010-0008

- BR-Ref: BR-0010-0008
- Given the consolidated rule BR-0010-0008
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0008
