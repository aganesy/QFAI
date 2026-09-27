---
name: prototyping-grill
owner: qfai-prototyping
purpose: "Settle by a delegated grilling session what the prototype is for, before the loop builds anything."
requires: [common-grilling-record]
roles: [orchestrator, product-experience-architect, completion-reviewer]
routing-profile: default
---

# prototyping-grill

The first step of a prototyping run. It fixes the scope the loop covers and
settles, by talking, the questions that do not need a prototype to answer.

## Reads

- `.qfai/assistant/skill/qfai-grilling/SKILL.md` and `.agents/rules/grilling.md`.
- The specs in the story tree, the UI contracts in scope (see [Scope](#scope))
  and root `DESIGN.md`.
- `.qfai/evidence/prototyping/grilling.md`, where an earlier run left one.

## Writes

- `.qfai/evidence/prototyping/grilling.md`, before C0 of `prototyping-loop`.

## Scope

The loop covers every UI-bearing UI contract: a YAML file under
`<contractsDir>/ui/` declaring a full `CON-UI-NNNN` ID and a non-empty
`screens[]`. Only those contracts enter the prototyping scope.

Inside an `npx qfai workflow` run the work order narrows that set:

- The run works only on the UI-bearing UI contracts that serve the business
  flow the work order's `target` binds. A contract serves a flow when one of its
  rules cites an example of one of that flow's stories.
- It settles the one visual decision the plan needs within the existing root
  `DESIGN.md` and those contracts. It changes no UI contract that serves only
  another flow, and creates no contract.
- When no UI-bearing contract serves the bound flow, the run writes no
  `DESIGN.md`, no UI contract and no surface declaration. It returns outcome
  `blocked` with one `debts` entry naming the missing UI surface, with
  `owningFlow` the bound flow and `resolvingOwner` `operator`.

A standalone invocation still resolves every UI-bearing UI contract.

The scope floor is unchanged: which UI contracts the loop covers is decided by
their declared IDs and screens, and no session narrows it.

## What is grilled, and what is prototyped

This skill exists for the questions talking cannot settle. "How should this
feel" and "one long form or three pages" need something to react to, and no
amount of rephrasing turns them into answerable ones — talking through one is
where a session balloons, because the agent rephrases, the user guesses, and the
scope grows to fill the uncertainty.

The questions around it can be settled by talking, and are grilled before the
loop starts, through the `qfai-grilling` skill. **Read
`.qfai/assistant/skill/qfai-grilling/SKILL.md` before starting either session**
— this one and the one `prototyping-loop` resumes after convergence. It is the
single implementation, and it carries what this step does not restate: the
preconditions a session is entered under, what it takes as input, what a
no-question mode does to it, and how it ends. A host that loads skill bodies
lazily hands the agent the name and not the procedure, and an agent with the
name alone improvises an interview that reads exactly like the method.

| Settled by talking, before the loop | Made answerable by the loop, settled by the user against it |
| ----------------------------------- | ----------------------------------------------------------- |
| What the prototype is for           | How it should feel                                          |
| What would count as better          | Which layout carries the task                               |
| What is out of bounds               | Which of two shapes reads faster                            |

Running the loop on the left column wastes cycles: the loop answers by building,
and building is the expensive way to learn something a sentence would have
settled. Grilling the right column is the error the rule master names, and it
costs a session rather than a cycle.

**The prototype makes a decision answerable; it does not take it.** Put the
result in front of the user and ask the question again against it. An agent that
builds one, judges it, and carries on has settled a question of taste on the
user's behalf — with more evidence than before, and still not the user's answer.

## Procedure

1. Resolve the scope above. With no UI-bearing contract at all, there is nothing
   to grill: go on to `prototyping-preflight`, whose deterministic no-op ends
   the run.
2. **Only what the inputs leave open.** The specs, the UI contracts in scope
   and `DESIGN.md` are read first, and a question they answer is not on the
   frontier: the method reads a fact rather than asking about it, and a session
   that re-opens a frozen requirement produces an answer that drifts from it.
   What is left is what the session is for.
3. Run the session. **It is delegated** (`.agents/rules/grilling.md` § Two
   kinds of session): a griller interviews the agents that generate and review
   the prototype, and each decision that is not critical takes its
   recommendation. `DESIGN.md` is frozen from the discussion stage's answers, so
   a question of taste or purpose it already answers is adopted from it. One it
   leaves open is product intent, which is critical, and goes to the user.
   The method is `.agents/rules/grilling.md`, and the session's own decisions
   are classified there rather than in this skill's buckets — they are the
   session's operations, not this one's.
4. Write the record (see [The record](#the-record)).
5. Apply the gate below before `prototyping-preflight` starts.

## Autopilot

`brand intent` is `hard-required`. Root `DESIGN.md` carries it; when the
evidence does not establish it, ask for it, and under a no-question mode stop
and name it.

## The record

**The session's answers are written down, and the loop reads them.** They go to
`.qfai/evidence/prototyping/grilling.md`, under `## Session` for the decisions
— an adopted one names the agent that recommended it and why it was taken —
and `## Escalated` for a critical decision the user has yet to settle. The
generator and the reviewer both take that file as an input — named in
`prototyping-loop`'s `## Evaluator Inputs (Mandatory)` and in the generator's
contract set — because a decision the loop cannot read is one it will
contradict on the next cycle, and the user will be asked to re-settle what they
already settled.

Run `common-grilling-record` with this file as the evidence path. It sets the
rules every record keeps and the decision rows the stage's Work Orders Summary
carries; the sections below are this file's own shape.

**Every row names what it applies to**, because one invocation runs a lineage
per `UI contract × screen` and a reader that cannot tell whose answer a row is
applies all of them to each:

| Scope                       | Decision | Answer |
| --------------------------- | -------- | ------ |
| `<ui-contract-id>/<screen>` | ...      | ...    |
| `<ui-contract-id>`          | ...      | ...    |
| `global`                    | ...      | ...    |

`global` is a real answer and not a default — what the whole prototype is for is
usually one — so it is written rather than assumed from a missing key. A
generator or reviewer reads the rows matching its own lineage plus the `global`
ones, and nothing else.

**The file is written before C0, empty session or not.** Where the frozen
inputs answered everything, it carries the heading and `none` under it, which
is a different statement from a file that is not there — a required input a
delegated role cannot find is an error it has to guess its way past, and
guessing is what the record exists to stop.

**It is a decision record, not a regenerable log.** A run log is reproducible by
rerunning its stage; these answers are not reproducible by re-running anything,
and every later generator and reviewer is required to read them. Keep the file
in place until the loop is certified. Like everything under `.qfai/evidence/`,
it stays local and is never committed.

## Gate

**A left-column decision still under `## Escalated` stops the run before C0.**
Under a no-question mode the session cannot ask, so whichever of what the
prototype is for, what would count as better and what is out of bounds
`DESIGN.md` leaves open is recorded open, and nobody answers it. Starting C0
there spends the whole cycle budget building against nothing: the generator has
no constraint to satisfy, and the reviewer prompt says in its own words that
without the record it grades every prototype against the same generic bar.
Report the open rows and stop, the way the acceptance session in
`prototyping-loop` stops on the choice it cannot put. The right column is not
this gate's subject — those are what the loop exists to make answerable, and
they are open by design until the user has something to react to.

Otherwise the step passes when `.qfai/evidence/prototyping/grilling.md` exists
with both sections and every row carries a `Scope`.
