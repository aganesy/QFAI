---
name: discussion-oq
owner: qfai-discussion
purpose: "Register every open question the discussion leaves, and drive the open count to zero."
requires: []
roles: [requirements-analyst]
routing-profile: default
---

# discussion-oq

Keeps the pack's open-question register. The open count is what blocks a
discussion from completing, so a decision nobody took cannot close the pack.

## Precondition

The same as `discussion-pack`: this run's stage report holds the
`## Grilling Session` row, its `Ended at` is written, and `Ended` is
`confirmed`, `user-closed`, `no-question`, or `adopted` meeting
`.agents/rules/grilling.md#explicit-delegation-for-a-discussion`.
Check the actual delegation and rounds, required inputs, empty tree and
human authority in the stage evidence; the ending label alone is insufficient.
Without that row, or with
`Ended: stopped`, write nothing and stop.

## A critical decision found while authoring

A decision found while registering that is critical under
`.agents/rules/grilling.md#critical-decisions` reopens the session for that
node only. Stop writing, ask the user one round on that node, record the round
as `.qfai/assistant/step/common-grilling-record/STEP.md#a-reopened-node` says,
then resume. The rest of the session's record stays as it is.
Recording the decision as an assumption is allowed only under a no-question
mode, labelled beside its open question.
A stop in that round ends the run as `stopped` does: no row is written,
writing stops, and the report names the pack files already written and the open node.

## Reads

- `.qfai/assistant/skill/qfai-discussion/references/oq-and-deferred-rules.md`
  for the canonical fields of the register, and for where each session outcome
  goes.
- `.qfai/assistant/skill/qfai-discussion/references/discussion-coverage-checklist.md`.
- The `Example Seeds` in `03_Story-Workshop.md`.

## Writes

In the pack under work:

- `11_OQ-Register.md`

## Procedure

1. Register each decision the session did not settle in `11_OQ-Register.md`
   with `Disposition: open`. Under `--auto`, that includes each labelled
   assumption the session recorded.
2. Turn every coverage-checklist topic the session did not cover, and every
   unresolved example seed, into an open question with an owner and a decision
   point, or into a deferred item.
3. Resolve open questions until the `Disposition: open` count is zero. Move
   each row to the disposition the reference names — `resolved`, `deferred` or
   `rejected` — and fill the fields that disposition requires.

## Gate

The reviewer confirms:

- every required topic in the coverage checklist is covered, or captured as an
  open question or a deferred item;
- every deferred row records its `Resolution`, and names in `Next-Decision-Point`
  the next point at which it is decided;
- no recommendation is left implicit.
