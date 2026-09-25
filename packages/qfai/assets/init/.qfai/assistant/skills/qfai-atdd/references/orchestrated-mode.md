# qfai-atdd in a workflow run

What `/qfai-atdd` does when `qfai workflow` hands it a work order. The field
names are those of the work order and the stage result.

## Entry check

The full check is
`.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.
For this skill:

- In mode `active`, a request with no work order and no name is passed to
  `qfai-run` with nothing edited.
- A worker checks the run, stage instance and work-order IDs against the work
  order, then does only that work order's work.

The rest of this file applies to a worker.

## Operations

| Operation                 | What the work order asks                                                   |
| ------------------------- | -------------------------------------------------------------------------- |
| `author-acceptance-tests` | Write the acceptance tests for the bound ledger rows and observe each RED  |
| `test-fix`                | Repair a defective `E2E`, `API` or `Integration` test the work order names |

The skill serves exactly these operations. A work order naming any other is refused.

## RED at the assertion

The result reports `expected_red` only for a failure at the intended assertion.
The failure kind goes in `red.failureKind`.

| Failure kind | Reported as          |
| ------------ | -------------------- |
| `assertion`  | `expected_red`       |
| `collection` | `unrun` or `blocked` |
| `import`     | `unrun` or `blocked` |
| `startup`    | `unrun` or `blocked` |
| `timeout`    | `unrun` or `blocked` |

A failure of any kind but `assertion` is never `expected_red`.

## Cross-spec obligations

- `PASS with cross-spec obligations` returns outcome `accepted_with_debt`, with
  one `debts` entry per obligation, naming its owning spec (`owningSpec`) and
  its resolving owner (`resolvingOwner`).
- A finding with no named owner is not handed on as a debt. The stage names the
  owner first, or reports the finding as its own.

## The seam round trip

1. A test that cannot reach its assertion for want of a route, an export or a
   module is returned `needs_repair` with a seam request (`seamRequest`) naming
   that test.
2. After the seam-only result is accepted, the same acceptance stage instance
   runs as a new attempt and takes RED at the assertion.
3. Only then is the full implementation handed on.

No second run starts: the round trip stays inside this run. What counts as RED
is `references/red-provenance.md`.

## The layer decision

- A shared Stage 0 snapshot is reused only for the inputs it covers.
- The layer each obligation needs is decided from the current spec and ledger
  at every stage start. It is never taken from the snapshot.

## `test-fix`

- This skill takes a test fix for an `E2E` row, an `API` row, and an
  `Integration` row with at least one test case at a level other than `L1` or
  `L2`.
- It takes none of a `Unit` row, a `Component` row, or an `Integration` row
  whose test cases are all `L1` or `L2`: those are `qfai-implement`'s. One `L3`
  test case among `L1` and `L2` cases makes the row this skill's.
- The result's `testFix` names the AC or BR cited before and after the fix
  (`citedBefore`, `citedAfter`), with an independent review (`reviewRef`) and a
  re-run (`rerunRef`).
- The fix does not edit `Status`, `TC-Refs`, `Layer` or `Boundary`. It may
  change `Test file` and `Selector`.
- The re-run is appended to the row's evidence section as a new round carrying
  its own `Revision`.
- A fix after which the expectation would cite a different AC or BR returns
  `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its
  `resolvingOwner`. No accepted test fix is returned for it.
