---
name: common-grilling-record
owner: common
purpose: "Write the record of the discussion stage's grilling session in the stage report, so a session that ran and one that was skipped can be told apart."
requires: []
roles: []
---

# common-grilling-record

The method is `.agents/rules/grilling.md`, and this step does not restate it.
This step is the record: the method writes no artifact of its own, so without
it a stage that grilled and one that skipped the session leave the same tree.

Only the discussion stage writes this record. Every other stage stops on a
contradiction under Article IX of `.qfai/assistant/rule/constitution.md`, and
reports what it settled in its final report.

## Rules the record keeps

- **The end time is written before work resumes.** A row holding only the final
  state reads the same whether the session ran first, ran after or never ran.
  Writing the end before the next write makes the order a record. It still
  cannot prove a session happened; the agent writes its own record.
- **`Ended` is one of the five endings** `.agents/rules/grilling.md` names:
  `confirmed`, `user-closed`, `adopted`, `no-question`, `stopped`. Only the first
  four let the work go on.
- **A stopped session is reported, not written.** The user ended it, and a row
  is a file change. The stage names the stopped session and its open nodes in
  its output and resumes no work.
- **A free-form cell is one line, with `|` written `\|`.** A pipe or a line
  break adds cells and moves counts under the wrong headings.

## Decisions

A settled decision is written where the story tree keeps it. Adopt a supported
recommendation in the appropriate `decisions.md` row or in the authored
artifact. Record an unresolved choice in `open-questions.md` with its next
action. Record a rejected option as a REJECTED decision row, so it stays
excluded on reruns.

Each decision record carries the four labelled Approach items stated at the top of
`.qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md`.

## One session

The stage holds one session per run. The row goes in the stage report, under
`## Grilling Session`, and is written before the first authored file:

```text
| Ended | Ended at | Authoring began | Frontier | Lookups | Decisions | Escalated |
| ----- | -------- | --------------- | -------- | ------- | --------- | --------- |
| confirmed | <ISO8601> | <ISO8601> | empty | none in flight | <n> | <n> |
```

The authoring endings are `confirmed`, `user-closed`, `no-question`, and
conditionally `adopted`. For `adopted`, verify
`.agents/rules/grilling.md#explicit-delegation-for-a-discussion`: actual user
delegation with source, scope and authority; actual griller-to-author rounds
with reasons and dissent; no open node or running lookup; all consumed required
inputs present; and actual human authority for every reserved decision.
Record these in the stage evidence, not as a fictional human option answer.
`Ended at` and `Authoring began` are actual timestamps, with authoring later.
A missing hard-required consumed input authorizes no authoring ending.
Allowing authoring is not a completion or validation receipt.
