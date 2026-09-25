---
id: 2026-09-24-spec-0018-create-authorization-id-gap
status: active
kind: blocker
created: 2026-09-24
updated: 2026-09-24
scope: spec-0018
blocking: true
promote-to: null
links: ["spec-0018"]
---

# Missing CREATE authorization ID at SDD dispatch

## What is blocked

`TDD-0005`–`TDD-0012`, `TDD-0065`, `TDD-0076`, `TDD-0077` and `TDD-0455` are
parked at `blocked` from `todo`. `TDD-0003` stays at `review-fix`; its sealed
Round 1 reviewers found the gap. Completed `TDD-0002` keeps its status and
awaits shared-test re-verification.

## Why it waits

`next` can issue an SDD work order with an empty `authorizationRefs` list when
the apparent CREATE approval has no persisted ID. The existing test case covers
only the valid authorization path. `CR-20260924-0006` records the proposed
negative test, the missing `ready` → `awaiting_input` contract edge and the
owner-skill reruns. Its approval is pending.

## What releases it

After explicit approval, the contract and spec owners apply the selected option
and sweep the dependent ledgers. The negative selector observes RED before the
code fix. Completed shared-test rows receive re-verification and fresh reviewer
verdicts; `TDD-0003` receives a new review round. Resume each parked row only
after the CR records `Applied at`.
