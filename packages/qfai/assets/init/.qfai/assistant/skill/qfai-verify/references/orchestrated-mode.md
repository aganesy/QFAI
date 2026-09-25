# qfai-verify in a workflow run

What `/qfai-verify` does when `npx qfai workflow` hands it a work order. The field
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

| Operation     | What the work order asks                                             |
| ------------- | -------------------------------------------------------------------- |
| `verify-full` | Run every required gate over the run's change and report each result |

The skill serves exactly these operations. A work order naming any other is refused.

## The stage result

- The stage writes this run's `.qfai/report/verify.json` and names it in
  `artifactRefs`.
- A `verify.json` written by another run, scoped to another flow or kept in a
  shared location is never named as this stage's report.
- The qa-gatekeeper verdict is a `reviewResults` entry, from a reviewer
  independent of the authors of what it reviews.
- The stage's own `gateResults` are information only: the run decides no gate
  from them.
- `outcome` and `testObservation` are reported apart.
- A required gate that did not run is reported `unrun`, never as a pass.

`verify.json` itself is unchanged inside a run: its fields and values are
`references/verify-output-contract.md`'s, and the run's values stay in the
stage result.

## Findings verify did not cause

Verify edits no artifact another owner holds. A finding it did not cause
returns `needs_repair`, with the finding listed in `debts` under its
`resolvingOwner`, so the run sends the repair there.

| Repair kind              | `resolvingOwner` |
| ------------------------ | ---------------- |
| `spec gap`               | `qfai-sdd`       |
| `acceptance-test defect` | `qfai-atdd`      |
| `implementation defect`  | `qfai-implement` |

These three are the only repair kinds. A spec gap is a story or contract gap.

## A missing environment

- A gate whose environment is missing returns the stage `blocked`, with the
  blocker `stage-blocked` and `operator` as the one who clears it.
- No debt is listed for it, and no repair is routed.
