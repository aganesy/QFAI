---
name: discussion-oq
owner: qfai-discussion
purpose: "Register every open question the discussion leaves, and drive the open count to zero."
requires: []
roles: [requirements-analyst, requirements-reviewer]
routing-profile: requirements-heavy
---

# discussion-oq

Keeps the pack's open-question files. The open count is what blocks a
discussion from completing, so a decision nobody took cannot close the pack.

## Precondition

The same as `discussion-pack`: this run's stage evidence holds the
`## Grilling Session` row, its `Ended at` is written, and `Ended` is
`confirmed`, `user-closed` or `no-question`. Without that row, or with
`Ended: stopped`, write nothing and stop.

## Reads

- `.qfai/assistant/skill/qfai-discussion/references/oq-and-deferred-rules.md`
  for the canonical fields of both files, and for where each session outcome
  goes.
- `.qfai/assistant/skill/qfai-discussion/references/discussion-coverage-checklist.md`.
- The `Example Seeds` in `03_Story-Workshop.md`.

## Writes

In the pack under work:

- `11_OQ-Register.md`
- `12_OQ-Resolution-Log.md`
- `13_Deferred.md`

## Procedure

1. Register each decision the session did not settle in `11_OQ-Register.md`
   with `Disposition: open`, and log it as `created` in
   `12_OQ-Resolution-Log.md`. Under `--auto`, that includes each labelled
   assumption the session recorded.
2. Turn every coverage-checklist topic the session did not cover, and every
   unresolved example seed, into an open question with an owner and a decision
   point, or into a deferred item.
3. Resolve open questions until the `Disposition: open` count is zero. Move
   each one by the disposition the reference names — `resolved`, `deferred`,
   `rejected` or `reopened` — in the register and the log in the same edit.
4. Move each deferred question to `13_Deferred.md` with every field the
   reference requires.

## Gate

The reviewer confirms:

- every required topic in the coverage checklist is covered, or captured as an
  open question or a deferred item;
- every deferred item has full metadata in `13_Deferred.md`, and the file agrees
  with the register;
- no recommendation is left implicit, and nothing is deferred without a next
  decision point.
