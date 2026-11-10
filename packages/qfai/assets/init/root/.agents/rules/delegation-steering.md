# Delegation Steering

How an agent steers a task it handed to another agent while the user is in the
session: look at the first actions, stop a wrong course early, and replace a
brief that two corrections did not fix.

A delegated task that starts off course rarely finds its way back alone, and
each correction stacked on a wrong start leaves that start in the agent's
context. A look at the first actions costs little, and a rewritten brief costs
less than a third correction.

## Scope

| Target                                                                   | Applies                                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| A task delegated to another agent in a session where the user is present | Always                                                                                                      |
| A run under `--auto`, or any run where nobody is present                 | Never: `.qfai/assistant/rule/shared-skill-operating-baseline.md`, "Unattended Runs: Ending a Turn", governs |
| Whether to delegate, and what a brief holds                              | Outside this rule: `.qfai/assistant/rule/shared-skill-delegation-baseline.md`                               |

## 1. Check the first actions

Where the host shows a delegated agent's progress, read its first actions as
they appear: the files it opens, the commands it runs, its first edit. They show
whether it read the brief as meant: the right paths, the right step, nothing
outside what it was given. Where the host shows nothing before the result, the
result is the first check.

## 2. Interrupt early

When the first actions go off course, such as a path outside the task, a step
the brief did not name or a goal read wrongly, interrupt then through the
host's message or stop mechanism. Do not wait for the result. Name what is off
and what the brief meant.

For an independent judgement, such as a review or a griller, off course means
outside its brief or its remit. A verdict the session disagrees with is not off
course, and nobody steers it. An interrupt to a judgement restates only the
brief's scope and remit, never the author's reasoning or view.

## 3. Restart after two corrections that do not land

A correction lands when the next actions follow it. After two corrections on
one task that do not land, send no third. Stop the task, rewrite the brief and
start again. The rewritten brief carries what was learned: what the first
attempt misread, the constraint it kept missing, the facts it had to search
for. It leaves out the transcript of the failed attempt.

A rewritten judgement brief stays black-box, as the delegation baseline says:
what was learned may sharpen the scope and the remit, never add the author's
reasoning. A restarted judgement is the same one review: its work order takes
the next replacement ordinal.

When the rewritten brief goes off course the same way, start no third attempt:
put it to the user with the next actions, as `user-questions.md` sets out.

## Related

- What a brief holds, and when to delegate at all:
  `.qfai/assistant/rule/shared-skill-delegation-baseline.md`
- The unit work order template:
  `.qfai/assistant/rule/references/worker-edit-boundary.md`
- A run with nobody present: `.qfai/assistant/rule/shared-skill-operating-baseline.md`
- The form of a question to the user: `user-questions.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
