---
name: qfai-run
title: QFAI Run (Change request entry)
description: "Use when the operator states a change, a fix or a question about the project in plain words and names no stage skill. Takes the request through `npx qfai workflow`, one stage after another, to its completion target."
argument-hint: "<the change, in your own words>"
allowed-tools: [Read, Glob, Grep, Write, Bash, TodoWrite, Task, Agent]
roles: [orchestrator]
mode: execution-focused
---

## /qfai-run - Change request entry

[DRIFT-PROTOCOL:MANDATORY]

The operator states a change once. This skill proposes the route and hands each
stage to its owning skill; `npx qfai workflow` decides what happens next.

- Every call and payload shape: `references/payloads.md`.
- What the operator sees, and how questions are put: `references/operator-screens.md`.
- Invoke the CLI through the launcher of `.qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher-mandatory`.

## What this skill never does

- Draft or review a story, a contract, a test, code or any other primary artifact.
- Decide completion, which only `finish` does.
- Record an approval. Only `decision`, with the operator's answer, does.
- Name a route, a stage kind or an internal identifier to the operator.

## Mode

Read the mode from `npx qfai workflow status` first.

| Mode     | What this skill does                                                                         |
| -------- | -------------------------------------------------------------------------------------------- |
| `active` | The run below                                                                                |
| `shadow` | Propose the stages and the reason. Call no write operation, and say that nothing was written |
| `off`    | Start no run. The operator invokes the stage skills by name                                  |

## Request kinds

Classify the request before any write call. Only `change` calls `start`.

- `resume`, or `continue` on a run in progress: call `resume`. Do not classify again.
- `cancel`: call `decision` with `stop`.
- `explicit_stage`, `plan_only`, `verify_only`: invoke the stage skill by name.
- `read_only`: answer it in the conversation.

## The run

1. **Start.** Write the start input under `.qfai/run/inbox/` and call `start`.
   The target is `working_tree` only when the operator said not to commit.
   Report the host and each capability truthfully.
2. **Route.** `next` returns the routing work order. Classify the request and
   write the route proposal: normative references in `expectedBehaviorRefs`,
   observed paths and evidence in `observedRefs`, each as `{ kind, ref }`; the
   one business flow in `affectedFlowIds`; a story no existing story represents
   in `newStories`. A search that finds nothing is not evidence that no story
   represents the goal. `proposedWriteScope` names every file a stage will
   write that git does not ignore. Submit the result with `accept`.
3. **Revise a refused proposal.** Fix every reason `proposal-refused` lists and
   submit again. The operator sees nothing unless a question or a halt follows.
4. **Announce.** Once the plan is checked, give the goal, the stages in order
   and the write scope. Ask nothing.
5. **Drive.** Call `next` and act on its work order, or on the run state it reports:
   - A work order: hand it whole to its executor skill in a sub-agent, write
     the stage result under `.qfai/run/<runId>/inbox/`, and call `accept`. A
     `retry` names the delay before the same work order is handed over again.
   - `awaiting_input`: put each open question as `references/operator-screens.md`
     says, and relay each answer with `decision`.
   - `blocked`: give the halt notice and stop.
   - `ready` with every stage accepted: go to step 6.
6. **Finish.** For `qfai_done`, commit the run's changes first. Then call
   `finish` and give the completion report.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

## Inputs Priority

- P1: `.qfai/assistant/rule/*`
- P2: what `npx qfai workflow` returns: the work order, the verdict, the open questions
- P3: the story tree under `<paths.specsDir>` and the contracts under `<paths.contractsDir>`, read to route
- P4: the operator's request

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- This skill creates no work order of its own: it hands on the ones `next` returns, integrates the results and presents them.
- Each stage runs in a sub-agent holding the executor skill and its work order.

### Capability Probe (MUST)

The first stage's delegation is the capability check. A result reporting it `unavailable` blocks the run.

### Delegation Failure (Hard Stop)

- `unavailable`: submit the result with `delegation` set, and stop on the halt the run returns.
- `saturated`: wait out the `retry` the run returns.
- Do not simulate roles. A stage is never done here in place of its skill.

## Work Orders Summary

Report one row per work order handed on.

| Step | Role (sub-agent) | Agent instance  | Task title         | Input (refs)   | Output (refs)    | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ------------------ | -------------- | ---------------- | ---------------------------- |
| 1    | `<executor>`     | `<instance id>` | `<stage in words>` | The work order | The stage result | PASS/REVISE                  |

### Reviewer Gate (MUST)

This skill writes no artifact, so it runs no Reviewer of its own. Each stage's reviewers return PASS or REVISE
on that stage's work, and `accept` refuses a result whose reviewer is not independent.

- The Drift Protocol applies to the run: a stage that would change a story, a
  contract or a decision outside its work order stops and says so.
- Test placement is each stage's, read against `.qfai/assistant/rule/test-layers.md`.
  A test-layer ratio is a signal, not a gate.

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - equivalent-option pick
- ask-user:
  - each question the run opens: a new story, a story-tree change, a material risk or a missing fact
  - scope expansions outside the active envelope
- hard-required:
  - change request (the operator's own words; an empty request is asked for, never guessed)

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry — `approval-required governance operations` — with the
operations its own run cannot authorize for itself. `hard-required` also takes the
undefaultable inputs this skill itself consumes, declared per skill and checked against
that declaration; the bucket is what a run cannot proceed without, and no prototype can
enumerate that for a skill it does not know. Otherwise a skill MUST NOT introduce an
entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

## Completion Contract (Shared)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check** (this skill's override): `npx qfai workflow finish` for the run, whose verdict the core computes — the change is complete only when it reports the completion target met. A `finish` that cannot run is UNRUN, not a pass.

project_memory:

- The operator names no stage after the first request.
- `finish` alone judges completion, and `decision` alone records an answer.
- This skill writes no primary artifact.
