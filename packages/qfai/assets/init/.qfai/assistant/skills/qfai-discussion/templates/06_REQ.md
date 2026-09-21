# 06 REQ (Functional Requirements)

<!-- UX-INTENT: If UI-bearing, see uiux/40_screen_contracts.md for screen interaction requirements -->

## Requirements Table

| REQ-ID   | Title | Description | Source   | Priority | Status |
| -------- | ----- | ----------- | -------- | -------- | ------ |
| REQ-0001 | TBD   | <desc>      | SRC-0001 | must     | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- A REQ-ID is `REQ-NNNN`, numbered from `REQ-0001` in every pack. Specs cite it
  with the pack's id (`discussion-<timestamp>#REQ-0001`), so it never collides
  with another pack's requirements or with IDs the project already uses. A
  prefixed form such as `REQ-D-0001` is not read: `npx qfai sdd preflight`
  reports the imported count as unknown.
- Status: `draft` → `reviewed` → `approved`.
