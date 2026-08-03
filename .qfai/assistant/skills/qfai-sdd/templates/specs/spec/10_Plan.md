# 10 Plan

**How-only.** This file states approach. It is validated as such:
`QFAI-PLAN-002` rejects status/progress headings, `QFAI-PLAN-003` rejects
update-history headings, and `QFAI-PLAN-004` rejects RC / Go-NoGo headings —
all at severity `error`. The four sections below are the allowed shape; keep
them and the gates are satisfied by construction.

Progress belongs in `tdd/test-list.md`, history in `09_delta.md`, and release
judgement nowhere in the spec pack.

## Implementation approach

- `<the shape of the change: which modules, which seams, in what order>`
- `<the alternative considered and why this one>`

## Test approach

- `<what is proven at which layer — see catalog/test-layers.md>`
- `<the boundary cases that must have their own case, not a shared one>`

## NFR approach

- `<how the floors in _policies/07_Constraints.md are met by this spec>`
- `<the measurement that would show a breach>`

## Risk mitigation

| Risk                    | Likelihood / impact | Mitigation          | Trigger to act        |
| ----------------------- | ------------------- | ------------------- | --------------------- |
| `<what could go wrong>` | `<low/med/high>`    | `<what reduces it>` | `<the observed sign>` |

## Authoring rules

- Do not add a "Status", "Progress", "TODO", "Remaining", "Done" or "WIP"
  heading. The ledger owns that, and duplicating it creates a second answer that
  drifts.
- Do not add a changelog or revision-history heading — `09_delta.md` is that
  record.
- A risk with no `Trigger to act` is a worry, not a mitigation: name the
  observation that says the mitigation is now needed.
