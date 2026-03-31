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
