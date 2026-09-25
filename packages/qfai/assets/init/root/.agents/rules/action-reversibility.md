# Action Reversibility

Which actions an agent takes on its own, judged by how hard each is to undo.

`version-discipline.md` bounds the release operations: a tag, a publish, a
release merge, and amending or force-pushing a release commit. This rule bounds
every other action by the same measure, and does not repeat those.

## Scope

| Target                               | Applies                                   |
| ------------------------------------ | ----------------------------------------- |
| Any action an agent is about to take | Classified before it runs                 |
| A release operation                  | `version-discipline.md`, not this rule    |
| What to build                        | Outside this rule — the spec decides that |

## 1. Classify the action before it runs

| Class                | Examples                                                                                              | Proceeds                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Local and reversible | Editing a file, running a test                                                                        | Yes                                      |
| Destructive          | Deleting a file or a branch, dropping a table, a recursive remove                                     | With the user, or a standing instruction |
| Hard to reverse      | A force push, a hard reset, amending a published commit, restoring a file that holds uncommitted work | With the user, or a standing instruction |
| Visible to others    | Pushing, commenting on a pull request or issue, sending a message, changing shared infrastructure     | With the user, or a standing instruction |

Classify by the effect, not by what the command looks like.

- `git checkout -- <file>` reads like switching a view. It discards every
  uncommitted edit in that file, including edits unrelated to the task.
- Probing which flags a command accepts by running it runs the command. A
  `--force` given during the probe writes for real.

## 2. A standing instruction

A standing instruction covers an action without asking again. It is one of two
things:

- the user's explicit request, in the current session, for that action;
- a skill the user invoked, whose documented steps include that action.

It covers the action it names, in the context it names, and nothing wider. A
request to push a branch does not cover a force push. A skill whose steps
include a commit does not cover deleting a branch.

Where no standing instruction covers the action, ask the user, in the form
`user-questions.md` sets out.

## 3. An obstacle is not a reason for a destructive shortcut

When something blocks the work, find its cause. Do not make it go away by
destroying something:

- skipping a hook to get a commit through;
- discarding a file because its contents are unfamiliar;
- resetting the tree to get past a failure.

Each one destroys work to make a symptom go away. A file with unfamiliar
contents is often someone else's work in progress. If the cause cannot be
fixed, stop and report it. Taking the destructive path is then the user's call.

## Related

- The release operations: `version-discipline.md`
- The form a question to the user arrives in: `user-questions.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
