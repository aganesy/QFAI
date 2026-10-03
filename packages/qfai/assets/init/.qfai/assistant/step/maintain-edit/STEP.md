---
name: maintain-edit
owner: qfai-maintain
purpose: "Change wording, a typo, a code comment or document prose inside the write scope, with no behaviour change, and stop before any edit that has a semantic effect."
requires: [common-gate-run]
roles: [doc-steward, completion-reviewer]
routing-profile: default
---

# maintain-edit

## What this is for

A change that alters what a reader reads and nothing a program or an agent
does: wording, a typo, a code comment, prose in a document.

## Non-goals

- A behaviour change of any size. That is another route's work.
- A story-tree file, a contract, or a row of `decisions.md` or `open-questions.md`.
- A file outside the write scope the request or the work order gives.

## Never a maintenance edit

These change behaviour even when the diff looks like text. A change to one stops
as [A semantic effect](#a-semantic-effect) says:

- dependency updates;
- workflow and CI files;
- authorization conditions and environment settings;
- SQL and generated files;
- a command a README states as the way to do something;
- QFAI's own skills, steps and rules.

A file extension alone never makes a change a maintenance edit.

## Reads

- The write scope the request or the work order gives.
- The files being edited.

## The edit

`doc-steward` makes the edit and runs the checks. The orchestrator makes no edit
itself.

1. Read the write scope. Edit nothing outside it.
2. Before editing, judge whether each planned edit has a semantic effect: a
   changed command, value, identifier, condition or rule. If one has, stop before
   editing as [A semantic effect](#a-semantic-effect) says. Do not make the edit.
3. Make the edit.
4. Run the applicable lint and link checks over the changed files through
   `common-gate-run`. A check the project does not have is UNRUN, not a pass.

## A semantic effect

A change to a file listed under [Never a maintenance edit](#never-a-maintenance-edit),
or a planned edit with a semantic effect, is not a maintenance edit. Nothing is
edited: stop, and report that the change is not a maintenance edit.

Inside a workflow run the stage returns it this way. No stage of the route
serves the finding's owner, so the run is `blocked`, naming the finding and the
owner skill to invoke by name:

- The outcome is `needs_repair`, and `changedFiles` is empty.
- `debts` holds one entry for the finding:
  - `findingCode` is `maintain-semantic-effect`;
  - `owningFlow` is `null`, because an `edit-text` run binds no flow;
  - `detectingCommand` names the review or the command that found it;
  - `resolvingOwner` is the skill that owns that kind of change, never one the
    `edit-text` plan names: `qfai-implement` for a code or configuration change,
    `qfai-sdd` for a story or contract.

## Passes when

This applies in a stage that follows a behaviour change the run already made.
Read first: that change, and the documents that describe the behaviour it
changed. The step passes when no document the change makes wrong exists. The pass names the
documents it read. Otherwise it brings each wrong document in line with the
change, as [The edit](#the-edit) says. A document that states a command the
change altered is brought in line too: the behaviour already changed, so the
edit changes none. Any other entry under
[Never a maintenance edit](#never-a-maintenance-edit) still stops the step.

## What the stage returns

- The diff.
- The no-behaviour-change judgement, with its reason.
- The independent review's verdict and who gave it.
- The lint and link checks run, and their results.

## Gate

The diff stays inside the write scope, the no-behaviour-change judgement names
its reason, and every check run over the changed files exited 0. The review that
follows (`completion-reviewer`) confirms the diff changes no behaviour; the
reviewer is never the agent that made the edit.
