---
id: 2026-09-25-spec-0018-announcement-owner
status: active
kind: blocker
created: 2026-09-25
updated: 2026-09-25
scope: spec-0018
blocking: true
promote-to: null
links: ["spec-0018"]
---

# Checked-plan test ownership

## What is blocked

`TDD-0014` is parked at `blocked` from `todo`. Its `TC-0018-0010` obligation is unchanged. The separate skill-text test `TDD-0261` and other rows continue.

## Why it waits

The ledger assigns the JSON verdict's plan test to the `qfai-run` skill asset, but the verdict comes from the workflow core. `CR-20260925-0003` asks for the SDD-owned `Owning module` correction. The CR is open and depends on the earlier ledger change in `CR-20260924-0002` being applied first.

## What releases it

After user approval, `/qfai-sdd spec-0018` Phase 2b corrects only this row's owner to `packages/qfai/src/core/workflow/decide.ts` and records the change in `09_delta.md`. Sweep the ledger without resetting the unchanged obligation. Resume `TDD-0014` after the CR records `Applied at`.
