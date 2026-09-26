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

One push proceeds without either: an ordinary push, without force, to a branch
the agent created for the current task. A push to the default branch, to a
protected branch or to someone else's branch, and every force push, stay in the
class the table gives them.

Classify by the effect, not by what the command looks like.

- `git checkout -- <file>` reads like switching a view. It discards every
  uncommitted edit in that file, including edits unrelated to the task.
- Probing which flags a command accepts by running it runs the command. A
  `--force` given during the probe writes for real.

## 2. A standing instruction

A standing instruction covers an action without asking again. It is one of
three things:

- the user's explicit request, in the current session, for that action;
- a skill the user invoked, whose documented steps include that action;
- an instruction recorded in memory or settings that names the action and its
  context, and was written from the user's own words.

It covers the action it names, in the context it names, and nothing wider. A
request to push a branch does not cover a force push. A skill whose steps
include a commit does not cover deleting a branch. A record saying "open a pull
request and push" covers the push, and not a merge or a force push.

Where no standing instruction covers the action, ask the user, in the form
`user-questions.md` sets out.

## 3. When the user cannot be asked

Under a mode that may not ask the user, such as `--auto`, an action that needs
the user and has no standing instruction is not taken. Record it as an open
question where the run's gates read it, and carry on with the rest of the work.

## 4. An obstacle is not a reason for a destructive shortcut

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
