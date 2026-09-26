---
name: qfai-maintain
title: QFAI Maintain (Non-normative edits)
description: "Use when invoked by name or handed a QFAI work order. Edits non-normative text and comments, such as wording, typos and doc prose, with no behaviour change."
argument-hint: "<the text or comment to change>"
allowed-tools: [Read, Glob, Grep, Write, Edit, Bash, TodoWrite, Task, Agent]
roles: [orchestrator, doc-steward, completion-reviewer]
routing-profile: default
mode: execution-focused
---

## /qfai-maintain - Non-normative edits

[DRIFT-PROTOCOL:MANDATORY]

Inside an `npx qfai workflow` run, follow `references/orchestrated-mode.md`.

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
- QFAI's own skills and rules.

A file extension alone never makes a change a maintenance edit.

## The edit

1. Read the write scope. Edit nothing outside it.
2. Before editing, judge whether each planned edit has a semantic effect: a
   changed command, value, identifier, condition or rule. If one has, stop before
   editing as [A semantic effect](#a-semantic-effect) says. Do not make the edit.
3. Make the edit.
4. Run the applicable lint and link checks over the changed files.
5. Hand the diff to an independent reviewer, who confirms it changes no
   behaviour.

## A semantic effect

A change to a file listed under [Never a maintenance edit](#never-a-maintenance-edit),
or a planned edit with a semantic effect, is not a maintenance edit. Nothing is
edited.

- In a run: return it as
  `references/orchestrated-mode.md#a-semantic-effect` says. The run is
  reclassified from there.
- Invoked by name: stop, and report that the change is not a maintenance edit.

## What the stage returns

- The diff.
- The no-behaviour-change judgement, with its reason.
- The independent review's verdict and who gave it.
- The lint and link checks run, and their results.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

## Inputs Priority

- P1: `.qfai/assistant/rule/*`
- P2: the write scope the request or the work order gives
- P3: the files being edited

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- `doc-steward` makes the edit and runs the checks. The orchestrator makes no
  edit itself.
- `completion-reviewer` reviews the diff. It never reviews an edit it made.

### Capability Probe (MUST)

The delegation to `doc-steward` is the capability check. Classify a failure
with the baseline taxonomy before anything else.

### Delegation Failure (Hard Stop)

- `unavailable`: stop, edit nothing, and report the class.
- `saturated`: use the baseline's bounded retry.
- Do not simulate roles. An edit or a review is never done here in place of its
  agent.

## Work Orders Summary

| Step | Role (sub-agent)      | Agent instance  | Task title      | Input (refs)           | Output (refs)        | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | --------------- | --------------- | ---------------------- | -------------------- | ---------------------------- |
| 1    | `doc-steward`         | `<instance id>` | Make the edit   | The write scope        | The diff, the checks | PASS/REVISE                  |
| 2    | `completion-reviewer` | `<instance id>` | Review the diff | The diff and judgement | The verdict          | PASS/REVISE                  |

### Reviewer Gate (MUST)

The stage is complete only when `completion-reviewer` returns PASS on the diff
and on the no-behaviour-change judgement. A REVISE sends the finding back to
`doc-steward`.

- The Drift Protocol applies to the run: an edit that would change a story, a
  contract or a decision is not this skill's, and stops.
- This skill writes no test, so `.qfai/assistant/rule/test-layers.md` has
  nothing to place. A test-layer ratio is a signal, not a gate.

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - equivalent-option pick
- ask-user:
  - scope expansions outside the active envelope
  - destructive operations (rm / overwrite / force-push)
- hard-required:
  - edit target (the text or comment to change; an empty target is asked for, never guessed)

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry — `approval-required governance operations` — with the
operations its own run cannot authorize for itself. `hard-required` also takes the
undefaultable inputs this skill itself consumes, declared per skill and checked against
that declaration; the bucket is what a run cannot proceed without, and no prototype can
enumerate that for a skill it does not know. Otherwise a skill MUST NOT introduce an
entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

## Completion Contract (Shared)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check** (this skill's override): the project's Markdown and link checks run over the changed files, each exiting 0. A check the project does not have is UNRUN, not a pass.

project_memory:

- A maintenance edit changes what a reader reads, never what a program or an agent does.
- A semantic effect found before an edit stops the edit; in a run it goes back for reclassification.
- The reviewer of the diff is never the agent that made it.
