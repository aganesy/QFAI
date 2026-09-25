# qfai-atdd in a workflow run

What `/qfai-atdd` does when `npx qfai workflow` hands it a work order. The field
names are those of the work order and the stage result.

## Entry check

The full check is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.
For this skill:

- In mode `active`, a request with no work order and no name is passed to
  `qfai-run` with nothing edited.
- A worker checks the run, stage instance and work-order IDs against the work
  order, then does only that work order's work.

The rest of this file applies to a worker.

## Operations

| Operation                 | What the work order asks                                                             |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `author-acceptance-tests` | Write the acceptance tests for the bound flow's BF and AC items and observe each RED |
| `test-fix`                | Repair a defective E2E, integration or API test the work order names                 |

The skill serves exactly these operations. A work order naming any other is refused.

## The bound flow

- The work order's `target` names the flow. The gate runs with
  `--flow BF-NNNN` for that flow, and no question asks which flow.
- The stage writes tests only for the BF and AC items of the work order's
  `obligations` that no test annotates. An EX is `/qfai-implement`'s.

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

## Findings another flow owns

- When the scoped gate passes and names findings another flow owns, the stage
  returns outcome `accepted_with_debt`, with one `debts` entry per finding,
  naming its `owningFlow` and its `resolvingOwner`.
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
- The layer each obligation needs is decided from the current story tree at
  every stage start. It is never taken from the snapshot.

## `test-fix`

- This skill takes a test fix when the first ID of the diagnosis's
  `matchedIds` is a BF or an AC, as `.qfai/assistant/rule/test-layers.md` maps
  BF to E2E and AC to integration or API. An EX is `qfai-implement`'s.
- The result's `testFix` names the IDs the test annotates before and after the
  fix (`citedBefore`, `citedAfter`), with an independent review (`reviewRef`)
  and a re-run (`rerunRef`).
- The fixed test annotates the same IDs as before. Its file or test title may
  change. No story, contract or `decisions.md` file changes.
- The re-run is recorded in `.qfai/evidence/atdd-BF-NNNN.md` for the bound
  flow.
- A fix after which the expectation would check a different ID returns
  `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its
  `resolvingOwner`. No accepted test fix is returned for it.
