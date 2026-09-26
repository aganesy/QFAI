# qfai-sdd in a workflow run

What `/qfai-sdd` does when `npx qfai workflow` hands it a work order. The field
names are those of the work order and the stage result.

## Entry check

The full check is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.
For this skill, in mode `active`:

- A request with no name and no work order is passed to `qfai-run`, and nothing
  is edited.
- A work order that matches no issued one: edit nothing and return the refusal
  to the harness.
- A valid work order is worked, and nothing else.

## Invoked by name

`/qfai-sdd` invoked by name runs standalone, ends at SDD and creates no run. A
request to go to the end is handed to a whole run through `qfai-run`.

## Operations

| Operation                       | What the work order asks                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `defect-example-seeding`        | Add the one example a diagnosed missing test needs, under an existing criterion           |
| `new-story`                     | Write the story, or the flow and its stories, for the new-story slot the work order binds |
| `update-or-applicability-check` | Change the bound flow's stories and contracts, or record that they do not apply           |

The skill serves exactly these operations. A work order naming any other is refused.

- `defect-example-seeding` follows
  `references/sdd-phase-checklists.md#defect-example-seeding-defect-example-seeding`.
- A work order with no `target` is refused. It never runs the no-argument batch.
- A `flow` target scopes the stage to that business flow, and its gate runs
  with `--flow BF-NNNN` for it.
- A `new_story` target's result reports one `bindings` entry per slot, naming
  the flow and the stories it created.

## Stage 1 approvals

Stage 1 approvals inside a run follow
`references/sdd-triage.md#inside-a-workflow-run`.

## A change to the story tree

A story-tree or contract file changes only on the operator's answer, given in
this run:

1. The first attempt asks once and changes nothing. It opens one `decision`
   question naming the files it would change and the proposed change, and
   returns `awaiting_input`. The concrete-abstract cycle below may add
   questions for its findings beside it.
2. The attempt that holds the answer, received through `authorizationRefs`,
   makes the change. It appends one `decisions.md` row at WIP whose Content
   opens `Change request:` and names every story-tree and contract file it
   changed, and `decisions.md` when it appended any other row. The row's
   Approach cites that answer as `<runId>/<authorizationId>` with its
   `answeredBy`.
3. The same attempt moves the row to DONE once every change the row names is
   written. The row stays at WIP only while changes it names remain for a later
   attempt of this stage, which moves it to DONE once it writes them.
4. A row that cites only the run's `request_scope` is refused. Leaving the row
   at TODO does not avoid the refusal.

A row present before the stage started keeps its ID, Content and Approach.
Only a row this stage appended changes its Status.

Upstream drift found outside the run's checked scope gets no `Change request:`
row here. The stage returns `blocked`, with each finding listed in `debts`.

## The concrete-abstract cycle in a run

Under `new-story` and `update-or-applicability-check`, the cycle of
`references/concrete-abstract-cycle.md` runs in the first attempt only:

1. The first attempt runs the cycle on its proposal before it asks the change
   question. That question shows the proposal as the cycle left it.
2. Each finding that goes to the user is a further `decision` question in the
   same `awaiting_input` result, beside the one change question. The attempt
   still writes nothing.
3. The attempt holding the answers runs no further cycle. It applies the answer
   to each finding the user decided, appends an `Unadjudicated:` row for each
   finding the user left open, appends the REJECTED rows, and writes the
   evidence rows of the cycles the first attempt ran. Its `Change request:` row
   names `decisions.md` and `open-questions.md` when it appended a row to them.
4. An adopted finding on an item outside the run's checked scope is upstream
   drift: no `Change request:` row, the item unchanged, and the stage returns
   `blocked`. `/qfai-sdd` invoked by name outside the run makes that change.

## `--auto` inside a run

Under `--auto` inside a run, an approval-required row with no satisfying
`human_decision` stops Stage 1: the row never reaches WIP, nothing that depends
on it is written, and the stage reports the row with its operation and target.
`--auto` approves nothing.

## Stage 0

- The shared Stage 0 snapshot is reused only after its key is recomputed, as the
  operating baseline states. Only the entries whose inputs changed are
  refreshed.
- The `npx qfai sdd preflight` readiness check runs in every attempt. It is never
  served from the snapshot.
