---
name: qfai-grill
title: QFAI Grill (User-invoked design interrogation)
description: "Run a grilling session on anything: a design, a product direction, a piece of writing. Needs no repository and writes no files. Invoked by the user, never by the agent."
disable-model-invocation: true
argument-hint: "<the design, problem or decision to interrogate>"
allowed-tools: [Read, Glob, Grep, Bash, TodoWrite, Task, Agent]
mode: interactive-by-default
---

## qfai-grill - the session a user asks for

[DRIFT-PROTOCOL:MANDATORY]

Run a grilling session on whatever the argument names. This skill holds no
method of its own: it directs the run to `qfai-grilling`, which is the one
implementation.

**`disable-model-invocation: true` is the mechanism, and it is stated rather
than implied.** A host offers a skill to the model from its description, so
omitting the description keeps it out of reach — on a host that tolerates a
skill without one. Others require it and register nothing, which loses the front
door the skill exists to be. Declaring the opt-out keeps the skill loadable
everywhere and reached only when the user names it, which is the whole
difference between the two: a session the user asked for, and a session a skill
started.

## What this is for

Anything. A feature not yet designed, a decision that keeps being deferred, a
constraint nobody has written down. It needs no repository, no spec and no
prior stage — a session is a conversation, and the argument is its subject.

## Non-goals

- **Not a place to state the method.** The method is `qfai-grilling`. Two
  statements of it drift, and the one a user reads is the one that gets
  forgotten.
- **Not a writer.** This skill produces no file. Nothing downstream reads a
  session it ran, so nothing is owed an artifact.
- **Not model-invoked.** The agent never fires this on its own. An agent that
  wants the method invokes the primitive.

## Preconditions

| Condition                    | Effect                                   |
| ---------------------------- | ---------------------------------------- |
| `qfai-grilling` is installed | Read it and follow it                    |
| `qfai-grilling` is absent    | Stop, and name what is missing           |
| The argument is empty        | Ask for the subject; a session needs one |
| A no-question mode is active | Run without asking; leftovers stay open  |

**Without the primitive, stop.** Report that
`.qfai/assistant/skills/qfai-grilling/SKILL.md` is not present and that
`npx qfai init` installs it. Do not interview from memory of how a session goes:
an improvised interview is the failure this split exists to prevent — it looks
like the method and answers to nothing, so a session that skipped the frontier
reads exactly like one that honoured it.

## The run

1. Read `.qfai/assistant/skills/qfai-grilling/SKILL.md`.
2. Take the argument as the subject at the root of the tree.
3. Follow that skill, round by round, until it ends.

Nothing is added here. A step this skill performs that the primitive does not
describe is a second method, which is what the split exists to stop.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
Do not open a second path for a question.

## Inputs Priority

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`
- P2: `.qfai/assistant/skills/qfai-grilling/SKILL.md` — the method
- P3: `.qfai/assistant/catalog/*`
- P4: whatever the subject names, as facts to read rather than decisions to
  re-open

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`. The
primitive's delegation rules apply unchanged: one thing is delegated, reading a
fact the environment holds, and the questions are never delegated.

### Orchestrator Protocol (MUST)

- The orchestrator reads the primitive, puts each round and reads the answers.
- It MUST NOT decide a frontier question on the user's behalf, and MUST NOT
  self-approve the session's end condition.

### Capability Probe (MUST)

1. Read the primitive at session start. That read is the capability check.
2. Attempt the first fact lookup a decision waits on.
3. If either fails, classify per the baseline taxonomy before doing anything
   else.

### Delegation Failure (Hard Stop)

- The primitive unreadable: stop and report it, as above.
- A lookup `unavailable`: read what can be read directly, under the baseline's
  sanctioned exception for a read-only fact lookup. Report the class, report
  every fact that stayed unread, and hold the decisions downstream of it open.
- A lookup `saturated`: use the baseline's bounded retry branch.
- Do not simulate roles. Do not answer a dispatched lookup from recollection —
  the frontier would then treat a guess as settled.

## Work Orders Summary

A session that dispatched any lookup MUST report a `## Work Orders Summary`
table to the user. Use the shared schema from
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md`, including
the `Agent instance` column. It is reported, not written: this skill produces no
file.

| Step | Role (sub-agent) | Agent instance  | Task title                      | Input (refs)                    | Output (refs)                   | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ------------------------------- | ------------------------------- | ------------------------------- | ---------------------------- |
| 1    | Reviewer         | `<instance id>` | Read the facts a round waits on | Decision and what it depends on | The fact, and where it was read | PASS/REVISE                  |

### Reviewer Gate (MUST)

There is no invoking stage, so the gate is the user reading the record. That is
why this skill writes no files: a record nobody reads is not a gate, and a file
nobody asked for is not a record.

**This entry point is therefore exempt from the baseline's reviewer gate.** That
gate rules on an artifact and this skill writes none, so no `PASS` is requested,
none is awaited, and a run never blocks for one. The remit row for `/qfai-grill`
records the same thing from the reviewer's side: there is no artifact to review.

What the user is shown at the end:

- every decision they answered, and what they answered;
- every decision left open, labelled as an assumption or as unasked;
- every fact taken as settled, with where it was read.

The exemption covers the verdict and nothing else. A lookup dispatched during the
session is a delegation like any other, so:

- Reviewer independence is defined normatively in
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#definition-independent-reviewer-normative`,
  and an agent that answered a lookup in this session is disqualified from
  answering it again as a check on itself.
- The Drift Protocol applies to the run, as it does to any run. Where a
  session touches tests, `test-layers.md` is what their placement is read
  against, and a ratio there is a signal rather than a gate.
- A lookup that could not be run at all is reported as unread, with the decisions
  downstream of it held open. That is this skill's `PENDING`, and it never reads
  as settled.

## Default Autopilot Policy

Every decision this skill meets falls in one of three named buckets. They are
the primitive's, because the decisions are.

- auto-decide:
  - output formatting
  - equivalent-option pick
- ask-user:
  - every decision on the frontier
  - the confirmation that closes the session
  - every decision a session between agents escalates, including one whose
    prerequisites never resolved and so never reached a frontier
- hard-required:
  - grilling subject (the design to interrogate; the argument supplies it, and
    an empty argument is asked for rather than guessed)

The ask-user entries instantiate the prototype's `decisions a grilling session
puts to the user` category. A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry: `approval-required governance operations` with the
operations its own run cannot authorize for itself, and `decisions a grilling session
puts to the user` with every decision its own session puts there — the frontier, the
confirmation that closes the session, and everything a session between agents escalates,
which includes a decision whose prerequisites never resolved and so never reached a
frontier. It MUST NOT introduce an entry outside the prototype's categories. Widening
triggers a Reviewer-Gate finding.

## Related

- The method this skill runs: `.qfai/assistant/skills/qfai-grilling/SKILL.md`
- Question form and the fallback without the tool:
  `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`
- The clarification budget and its exemptions:
  `.qfai/assistant/constitution/constitution.md#article-vi--clarification-budget-avoid-endless-qa`

project_memory:

- This skill states no method. The method is `qfai-grilling`, read at session start; a step performed here that the primitive does not describe is a second method.
- Without the primitive the run stops and names it. An improvised interview reads exactly like the method and answers to nothing.
- No file is written. There is no invoking stage, so the record is what the user is shown.
- The agent never fires this skill on its own. `disable-model-invocation: true` is what keeps a host from offering it, and it is declared rather than left to the absence of a description — a host that requires one would otherwise register nothing.
