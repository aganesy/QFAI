---
name: common-grilling-record
owner: common
purpose: "Write what a grilling session asked and decided as rows of the run's deliberation record."
requires: []
---

# common-grilling-record

The method is `.agents/rules/grilling.md`, and this step does not restate it.
This step is where a session's results go: rows of the run's deliberation
record, written as `.qfai/assistant/rule/references/deliberation-record.md`
says. Apart from those rows, no stage writes a grilling record, a session
table or a marker saying that no session was held.

## Rows the session writes

| What the session did                                        | Row                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Put a question to the user                                  | One Interview row, under the stage's subheading, written when the answer arrives                   |
| Took a decision in a delegated session                      | One Agent decisions row with at least three options, the griller's recommendation chosen           |
| Took an assumption on a closure or under a no-question mode | One Agent decisions row whose Background says it is an assumption                                  |
| Overturned an earlier row of the same record                | A new row whose Background says which row it overturns; the earlier row stays                      |
| Left a question open                                        | No record row of its own: one `<paths.specsDir>/open-questions.md` row, in the register's own form |

**A free-form cell is one line, with `|` written `\|`.** A pipe or a line
break adds cells and moves values under the wrong headings, which
`npx qfai validate` reports as `QFAI-DELIB-001`.

## What a session does not write

- No row for a step that held no session: nothing is written to say none was held.
- No timestamp, ending or count of its own. The ending is reported in the
  stage report, and a `stopped` session writes nothing more.
- No row of `decisions.md` and no other story-tree file, except where the
  invoking stage itself writes the policy layer.

## A reopened node

A critical decision found later in the same run reopens the session for that
node only, for one round to the user. Its question is a new Interview row under
the stage that met it. The rows already written stay as written.
