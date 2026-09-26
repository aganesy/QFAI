---
id: 2026-09-24-spec-0013-open-decisions-after-ledger-reseed
status: archived
kind: blocker
created: 2026-09-24
updated: 2026-09-25
scope: BF-0001
blocking: false
promote-to: null
closure-rationale: The story-tree cutover removed the spec-0013 execution ledger, so no row
  is parked any more. The criteria and examples these rows cited are
  BF-0001 story-tree items.
links:
  - BF-0001
---

# Acceptance rows await existing decisions

## What is blocked

Twenty-five spec-0013 ledger rows are parked at `blocked`. They concern the
primary-task count rule, UI contract template path, surface-type behavior,
legacy contract window, and authored task content in the shipped template.
Each row names its open Change Request in `Blocked-By`.

## Why it waits

The approved ledger repair separated independently observable results. The
existing open Change Requests still dispute some of those results. Completing
their tests now would claim a behavior before the corresponding product choice
or defect correction is approved and applied.

## What releases it

Resolve and apply the Change Requests named by each row. Rerun
`/qfai-sdd spec-0013` for any changed upstream statement, then resume the
affected rows through `/qfai-atdd` and `/qfai-implement` with fresh evidence.
