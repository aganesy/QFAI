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

An **architectural element** is a thing this plan introduces for other things to
use: a module, a seam, an adapter, a shared helper, a contract, a deployment
boundary. What makes it one is that something else is meant to go through it. A
change entirely inside one caller is not one, however large.

For each architectural element, cite at least three distinct concrete usages
(case, example, contract or interaction references). Planned future usage and
three links to one usage do not count. If the safety floor in
`.agents/rules/minimal-implementation.md` § 2 requires an element with fewer
usages, cite the necessary usages and the obligation that requires that element;
never cut the obligation to clear the count. Subject to the same floor, shared
code still waits for its third actual caller; documentation references do not
prove three callers.

The count is of call sites that exist when the element does, wherever they came
from: one change wiring three modules to a new adapter leaves three callers. What
does not count is a usage nobody has written — a plan, a comment, a document —
so the implementing stage counts the call sites again against this section
before the element lands.

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
