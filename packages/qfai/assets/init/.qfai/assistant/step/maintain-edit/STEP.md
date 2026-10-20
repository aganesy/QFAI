---
name: maintain-edit
owner: qfai-maintain
purpose: "Change wording, a typo, a code comment or document prose inside the write scope, with no behaviour change, and stop before any edit that has a semantic effect."
requires: [common-gate-run]
roles: [doc-steward]
routing-profile: default
---

# maintain-edit

## What this is for

A change that alters what a reader reads and nothing a person, program or
agent does: wording, a typo, a code comment, prose in a document.

## Non-goals

- A behaviour change of any size. That is another route's work.
- A story-tree file, a contract, or a row of `decisions.md` or `open-questions.md`,
  except as [Resolving conflicts](#resolving-conflicts) allows.
- A file outside the write scope the request or the work order gives.

## Never a maintenance edit

These change behaviour even when the diff looks like text. A change to one stops
as [A semantic effect](#a-semantic-effect) says:

- dependency updates;
- workflow and CI files;
- authorization conditions and environment settings;
- SQL, generated files and lockfiles;
- a command a README states as the way to do something;
- QFAI's own skills, steps and rules.

A file extension alone never makes a change a maintenance edit.

A procedure's actions, required values, commands and order govern what a person
does. Changing any of them has a semantic effect, even when only Markdown
changes.

## Resolving conflicts

In the `resolve-conflicts` route, the step merges the named base into the
branch and keeps every record's meaning. `verify-commit` concludes the merge.

1. Fetch the base (`git fetch`), then on a clean tree, before the merge,
   renumber every `decisions.md` row the branch added, from the lowest one
   whose ID the fetched base now declares upward, lowest first, by the
   `npx qfai sdd renumber-decision` procedure in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md` (two branches
   taking the same ID), and commit after each run. The union merge of
   `decisions.md` duplicates a colliding ID without a conflict, so this runs
   first. When a merge has already stopped with conflicts, run
   `git merge --abort`, renumber, and merge again.
2. Start or resume the merge with `git merge --no-commit <base>`.
3. Resolve each conflict. The base's item keeps its ID; never rename it. An
   item the branch added whose ID collides takes the next free ID of its scope,
   with every citation of it. Every other edit only keeps what one side already
   had: what each side added to a conflicting block.

Stop before the edit, as [A semantic effect](#a-semantic-effect) says, on any
of these:

- Content neither side had is a semantic effect.
- When both sides changed the same record, keeping both is a semantic effect:
  stop.
- An ID that two records already share on one history before this merge,
  carried in by an earlier merge, is a semantic effect: stop.
- A conflict in code, or in a file listed under
  [Never a maintenance edit](#never-a-maintenance-edit), such as a generated
  file or a lockfile, stops: its owner route resolves or regenerates it.
- A conflict in a pin or digest file, or in a file with an owner marker or a
  CODEOWNERS entry, stops.
- After the merge, check each union-merged register, such as `decisions.md`,
  for an ID declared twice. A duplicate is a semantic effect: stop.

### Several branches

When the user names several branches to take one base into, each branch is its
own run of this route, one branch at a time, with every rule above.

- Take the base in by merge, never by rebase. Never force-push a branch.
- On a stop, abort that branch's merge with `git merge --abort`, or keep each
  branch in its own worktree, report the branch at its commit before the merge,
  and go on with the next branch.
- The verify block repairs no failure on such a branch: a failing gate undoes
  the merge and holds the branch.
- The route pushes nothing. A push the user's instruction names is planned
  after the run as an order. A branch with a failed or UNRUN gate is not
  pushed. A gate DELEGATED to CI may be pushed under the user's push
  instruction once every gate that runs locally has passed, and the branch is
  not merged until that CI check is green.
- Report each branch's result: merged locally, pushed, stopped on the named
  file and hunk, or held by the named gate.

## Reads

- The write scope the request or the work order gives.
- The files being edited.
- `.agents/rules/documentation-clarity.md`, when writing the prose this step produces.

## The edit

`doc-steward` makes the edit and runs the checks. The orchestrator makes no edit
itself.

1. Read the write scope. Edit nothing outside it.
2. Before editing, judge whether each planned edit has a semantic effect: a
   changed command, value, identifier, condition or rule, except a renumber
   [Resolving conflicts](#resolving-conflicts) allows. If one has, stop before
   editing as [A semantic effect](#a-semantic-effect) says. Do not make the edit.
3. Make the edit.
4. Run the applicable lint and link checks over the changed files through
   `common-gate-run`. A check the project does not have is UNRUN, not a pass.

## A semantic effect

A change to a file listed under [Never a maintenance edit](#never-a-maintenance-edit),
or a planned edit with a semantic effect, is not a maintenance edit. Nothing is
edited: stop, and report that the change is not a maintenance edit.

In a workflow run, report `needs_repair`: no stage of the route serves the finding's owner,
so the run is `blocked`, naming the finding and the owner skill to invoke by name.
The session report records:

- the semantic effect, affected paths and the review or command that found it;
- that nothing was edited and this run binds no flow;
- the owner skill to invoke by name: `qfai-implement` for code or configuration,
  or `qfai-sdd` for a story or contract;
- the authorized owner route needed before work can resume.

Do not treat a stage of this route's plan as the owner of this repair.

## Passes when

This applies in a stage that follows a behaviour change the run already made.
Read first: that change, and the documents that describe the behaviour it
changed. The step passes when no document the change makes wrong exists. The pass names the
documents it read. Otherwise it brings each wrong document in line with the
change, as [The edit](#the-edit) says. A document that states a command the
change altered is brought in line too: the behaviour already changed, so the
edit changes none. Any other entry under
[Never a maintenance edit](#never-a-maintenance-edit) still stops the step.

## Stage report

- The diff.
- The no-behaviour-change judgement, with its reason.
- The independent review's verdict and who gave it.
- The lint and link checks run, and their results.
- In the `resolve-conflicts` route: the base, each renumber as old → new, and
  the combined diff of each resolved path, taken with `git diff` before it is
  staged, and `git diff` of every path the renumbers touched. Every added line
  is inside one side's text, except the ID changes that list names.

## Gate

The diff stays inside the write scope, the no-behaviour-change judgement names
its reason, and every check run over the changed files exited 0. The review that
follows (`implementation-reviewer`) confirms the diff changes no behaviour; the
reviewer is never the agent that made the edit. In the `resolve-conflicts`
route, that review runs as `common-review-cycle` says: a resolution that
touches no story-tree file, contract or register row gets no reviewer. The
combined diff passes the added-line check before `verify-commit` commits.
