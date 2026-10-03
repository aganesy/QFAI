---
name: common-grilling-record
owner: common
purpose: "Write the record of a grilling session where the stage's reviewer reads it, so a session that ran, one that was skipped and one from an earlier run can be told apart."
requires: []
roles: []
---

# common-grilling-record

The method is `.agents/rules/grilling.md`, and Article IX of
`.qfai/assistant/rule/constitution.md` says which sessions a stage runs. Neither
is restated here. This step is the record: the method writes no artifact of its
own, so without it a stage that grilled and one that skipped the session leave
the same tree.

## Where the record goes

The calling step passes the evidence path. The shape follows the stage.

| Owner              | Evidence file                             | Section                 | Shape                         |
| ------------------ | ----------------------------------------- | ----------------------- | ----------------------------- |
| `qfai-discussion`  | `.qfai/evidence/discussion-<stamp>.md`    | `## Grilling Session`   | [One session](#one-session)   |
| `qfai-sdd`         | `.qfai/evidence/sdd-BF-NNNN.md`, per flow | `## Pre-draft Grilling` | [Checkpoints](#checkpoints)   |
| `qfai-atdd`        | `.qfai/evidence/atdd-BF-NNNN.md`          | `## Grilling Session`   | [Run blocks](#run-blocks)     |
| `qfai-implement`   | `.qfai/evidence/implement-BF-NNNN.md`     | `## Grilling Session`   | [Run blocks](#run-blocks)     |
| `qfai-verify`      | `.qfai/evidence/verify-<run-id>.md`       | `## Grilling Session`   | [Run blocks](#run-blocks)     |
| `qfai-prototyping` | `.qfai/prototype/grilling.md`             | `## Session`            | the owner's own decision file |

Every shape also writes the decision rows below into the stage's Work Orders
Summary. Evidence stays local and is never committed
(`.qfai/assistant/rule/drift-protocol.md#evidence-stays-local`).

## Rules every shape keeps

- **The end time is written before work resumes.** A row holding only the final
  state reads the same whether the session ran first, ran after or never ran.
  Writing the end before the next write makes the order a record. It still
  cannot prove a session happened; the agent writes its own record.
- **`Ended` is one of the five endings** `.agents/rules/grilling.md` names:
  `confirmed`, `user-closed`, `adopted`, `no-question`, `stopped`. Only the first
  four let the work go on. A delegated session that completes ends `adopted`.
- **A stopped session is reported, not written.** The user ended it, and a row
  is a file change. The stage names the stopped session and its open nodes in
  its output and resumes no work. A row that already exists for one keeps
  `Work resumed` empty.
- **A free-form cell is one line, with `|` written `\|`.** A pipe or a line
  break adds cells and moves counts under the wrong headings.
- **`Revision`** is a git revision or `working-tree+<hash>`, as
  `.qfai/assistant/skill/qfai-implement/references/evidence-revision.md` defines.

## Decision rows

Each decision a session settled is one row in the stage's Work Orders Summary,
with `Task title` = `grilling(<where>/<adjudication>): <the decision>` and
`Agent instance` = the agent that made the recommendation. The schema, the
`agents` row's reason and disagreeing positions, the `none` marker and the
dispositions are
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#work-orders-summary`.

- `<adjudication>` is `user`, `agents` or `withdrawn`.
- A stage that settled no decision writes `grilling(<where>/none): none`.
- Where the file holds several invocations, `<where>` carries the run key, as
  [Run blocks](#run-blocks) sets out.

On the story tree, a settled decision is also written where the tree keeps it.
Adopt a supported recommendation in the appropriate `decisions.md` row or in the
authored artifact. Record an unresolved choice in `open-questions.md` with its
next action. Record a rejected option as a REJECTED decision row, so it stays
excluded on reruns.

## One session

A stage whose interview is its work holds one session per run. The row is
written before the first authored file:

```text
| Ended | Ended at | Authoring began | Frontier | Lookups | Decisions | Escalated |
| ----- | -------- | --------------- | -------- | ------- | --------- | --------- |
| confirmed | <ISO8601> | <ISO8601> | empty | none in flight | <n> | <n> |
```

Only `confirmed`, `user-closed` and `no-question` authorize authoring.
`Authoring began` is later than `Ended at`.

## Checkpoints

A stage that grills before each design-writing part records one row per
checkpoint, before that part's first mutation:

```text
| Phase | Session | Participants | Frontier | Recommendation | Disposition | Decision/OQ IDs | Ended at | Wrote at | Evidence |
```

A missing or skipped checkpoint leaves the evidence at `REVISE`. A Work Orders
Summary row does not replace it. A change that exposes another flow records that
flow's checkpoint before the next mutation.

## Run blocks

A stage that may open several sessions writes one block per invocation, headed
by the invocation's start in UTC to the millisecond, with the host run
identifier beside it where there is one:

```text
### /<stage> — run started 2026-01-01T09:02:00.417Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-01-01T09:14:00Z | a1b2c3d | 2026-01-01T09:15:20Z | preflight | empty | none in flight | 2 | 0 | 0 |

Closed S2: "proceed"
Open S2: <the node> — assumed: <the value the stage used>
Escalated S1: <the critical decision> — answered: <the answer> | not yet answered
```

- **One block per invocation and per stage.** An evidence file is updated in
  place, and two stages may share one, so an older block cannot pass as the
  current run. The orchestrator gives each reviewer the run start in its work
  order; the heading must carry exactly that value.
- **`Preflight`** is `session opened` or `confidence high`. When it says
  `session opened`, exactly one row's `Subject` is `preflight`.
- **`Session`** runs `S1`, `S2`, … in opening order, unique, none skipped.
  Every `Ended at` is at or after the run start and at or after the previous
  row's.
- **`Work resumed`** is when the stage next wrote, later than `Ended at`. A run
  that did not resume writes `none — <why>`. A blank is a `REVISE`, except on a
  `stopped` row.
- **Lines under the table** name their `Session`: one `Confirmed` line quoting
  the reply per `confirmed` row, one `Closed` line per `user-closed` row, one
  `Open` line per node left open, one `Escalated` line per critical decision.
  An unanswered escalation is an open node, so it is also an `Open` line.
- **`<where>` in a decision row is `<Session>@<run key>`**, the run key being
  the heading's time and identifier. The `none` marker is
  `grilling(-@<run key>/none): none`.

## Reviewer checks

The completion reviewer reads the record against the run start from its work
order and returns `REVISE` on any of these:

- a missing record, a duplicate session key, or a block whose heading differs
  from the stated run start;
- an `Ended` outside the five endings, or work resumed after a `stopped` one;
- `Open`, `Escalated` or `Decisions` not equal to the lines and decision rows
  keyed to that session, or a decision row naming a session no row holds;
- `confirmed` or `user-closed` without the quoted reply, or a `user-closed`
  open node without its labelled assumption, or one no closure may assume;
- `adopted` or `no-question` with a node open or an escalation unanswered;
  `no-question` with any reply recorded under it;
- an `agents` row on a critical decision, or an adopted decision without its
  `agents` row;
- both the `none` marker and a decision row for one run.

A `no-question` ending cannot hide an open node: the question goes in the stage
evidence and completion stays pending.
