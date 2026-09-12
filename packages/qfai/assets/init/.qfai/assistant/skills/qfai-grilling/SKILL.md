---
name: qfai-grilling
title: QFAI Grilling (Design interrogation)
description: "Interrogate an unfixed design in rounds: a tree of open decisions, a frontier of the ones answerable now, facts read rather than asked, and an end condition the user holds."
allowed-tools: [Read, Glob, Grep, Bash, TodoWrite, Task, Agent]
mode: interactive-by-default
---

## qfai-grilling - interrogate a design before it is fixed

[DRIFT-PROTOCOL:MANDATORY]

The one implementation of the interview method. A skill that needs a design
interrogated invokes this rather than writing rounds of its own, so there is one
method to review when it changes and one behaviour an operator learns.

## What this is for

A design has open decisions. Left open, they are decided anyway — by the agent,
silently, at the moment the code needs an answer. This method surfaces them
first, in an order where each can be answered honestly, and stops only when the
user agrees the understanding is shared.

## Non-goals

- **Not a substitute for a specification.** Work already specified is governed
  by the spec, and a disagreement with a requirement is a Change Request.
- **Not a question budget.** How many questions are worth asking is Article VI's
  subject. This decides which are asked, in what order, and when asking stops.
- **Not a stage.** It runs inside whatever stage invoked it and produces no
  artifact of its own.

## Preconditions

| Condition                           | Effect                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------- |
| A design that is not yet fixed      | Proceed                                                                   |
| The work is already specified       | Do not invoke; the spec is the authority                                  |
| A no-question mode is active        | Run without asking; open every decision left over as a question           |
| An ambiguity met while implementing | Not a session on its own — an ordinary clarification under its own budget |
| An execution stage declaring one    | A session. Article IX names two, at the preflight and on detection        |

The last two rows are the same rule from both sides: meeting an ambiguity does
not start a session, and a stage that **declares** one has started it. What
separates them is the declaration, which is what makes the class decidable when
the question is asked rather than arguable afterwards
(`.qfai/assistant/constitution/constitution.md` Article IX).

**A no-question mode silences the questions, not the session.** An invocation
told not to ask — `--auto`, or whatever the host spells it as — settles what the
evidence settles, dispatches the lookups, and opens every decision left over as
a question in the register the stage reads, so the stage cannot complete over
it. Where a document requires the field to hold something, write the defaulted
value and label it an assumption beside that open question
(`.qfai/assistant/constitution/constitution.md` Article X, rule 6). What is
forbidden is the assumption with no open question against it. Declaring a
session is still not a way to ask.

## The design tree

The subject sits at the root. Below it hang two kinds of node, and a node hangs
off whatever it depends on.

| Node                       | Settled by                                    | State while open |
| -------------------------- | --------------------------------------------- | ---------------- |
| Decision                   | The user, when asked                          | Open             |
| Fact the environment holds | The agent, by reading or dispatching a lookup | Open, in flight  |
| Fact only the user holds   | The user, when asked                          | Open             |

**A fact the environment does not hold is still a fact.** An unpublished date, a
constraint that lives in a contract, a number only the user knows: no lookup
reaches it, and it is not a decision either. Ask for it as the value it is, with
no options and no recommended answer — nothing is being decided, so there is
nothing to recommend, and a recommended value the agent does not hold is a guess
the user is invited to accept.

All three are prerequisites, so a decision waiting on a fact is on the tree as
exactly that. The tree is not written once: each answer changes what the
remaining nodes are, so it is the current state of what is settled, not a plan
made at the start.

## The frontier

The frontier is every node that can be settled now: every decision whose
prerequisites are all settled — every decision it depended on answered, and
every fact it depended on read — and every user-held fact whose own
prerequisites are settled.

A user-held fact belongs there because nothing else can put it there. Left off,
the decision below it waits on a node no round ever asks, so the frontier never
empties and the session cannot complete.

Those are the only questions that can honestly be asked yet. A question whose
answer depends on an unanswered one cannot be answered, only guessed at, and a
guess recorded as an answer is worse than an open question because nothing later
re-opens it.

## One round

1. Recompute the frontier from what is now settled.
2. Dispatch the fact lookups the remaining decisions wait on. Do not block the
   round on them.
3. Put the whole frontier at once, so the user sees what is being decided
   together.
4. Read the answers, then return to step 1.

Two questions never share a round when one depends on the other; the dependent
one belongs to a later round. The next round is never written ahead of the
answers it is computed from.

**Where the host's question tool takes fewer questions than the frontier holds**,
deliver the round in host-sized batches. The frontier is not recomputed between
them, no answer is acted on until the round is exhausted, and each batch is read
for a closing answer before the next is put. Batching is how one round reaches a
host that cannot show it whole; it never makes two rounds, and
`.agents/rules/user-questions.md` carries the rest of its mechanics.

## Facts are not asked

| Kind                                     | Who settles it | How                                         |
| ---------------------------------------- | -------------- | ------------------------------------------- |
| A fact the environment holds             | The agent      | Read it, or dispatch a sub-agent to read it |
| A decision about what is wanted or worth | The user       | Ask it, and wait                            |

Asking the user for a fact the repository already states spends the one thing a
round is spending, which is the user's attention.

Looking a fact up does not stop the round. Only the questions downstream of a
running lookup wait for it; the rest of the frontier is asked meanwhile.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
Do not open a second path for a question. Every round goes through it, and so
does the confirmation that closes the session.

## Inputs Priority

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`
- P2: `.qfai/assistant/catalog/*` + `.qfai/assistant/manifest/agent-routing.yml`
- P3: the subject the invoking stage named, and the artifacts it points at
- P4: `.qfai/specs/**` and `.qfai/contracts/**`, as facts to read rather than
  decisions to re-open

A fact this order can settle is not a question. Reaching P3 or P4 for it is the
method, not a fallback.

## The shape of each question

Number each question, give it a title, and state the recommended answer on a
line of its own. That shape is what makes a round answerable by number: a user
who agrees with every recommendation says so once, and a user who disagrees with
the third names the third.

## The budget does not end a session

A grilling question spends no clarification budget, and exhausting the budget
does not end a session
(`.qfai/assistant/constitution/constitution.md#article-vi--clarification-budget-avoid-endless-qa`).

A budget bounds the questions asked to resolve ambiguity in a request. These are
the decisions the design itself leaves open, and a cap on them ends the session
with those decisions still open — which the agent would then proceed on as
labelled assumptions, assuming exactly what the session existed to settle.

## When the session ends

A session **completes** on two conditions, both required.

1. No node is open — the frontier is empty **and** no fact lookup is still
   running.
2. The user confirms the understanding is shared.

Condition 1 is about the whole tree. When every remaining decision waits on a
lookup the frontier is empty while the tree still holds open nodes, and
completing there would close the session before the lookup could raise the
questions it was dispatched to answer.

There is no question cap. A design is not finished being interrogated because a
number was reached, and a short session is not evidence that the design was
simple.

**A session between agents cannot reach condition 2**, because no user is there
to confirm. It ends on a budget instead: two rounds, then every decision still
open goes to the user, with three subjects escalating at once —
product or business intent no authoritative artifact answers, a decision
contradicting a spec, a contract or a recorded decision, and a decision resting
on nothing authoritative. That is the one place a session ends on a count, and
it counts rounds between agents rather than questions put to a user
(`.qfai/assistant/constitution/review-convergence.md`).

**A session under a no-question mode cannot reach condition 2 either**, because
there is a user and the mode forbids asking them. It ends when nothing on the
frontier is still waiting: every decision the evidence settled is settled, and
every one it did not is opened as a question where the stage's own gate reads it
(`.qfai/assistant/constitution/constitution.md` Article X, rule 6). The register
write is the ending — without one, a stage that resolved its whole frontier by
inspection would wait forever for a confirmation nobody may give.

### The user ends it whenever they say so

Completion is how a session ends on its own. It is not the only way one ends.

- **stop** ends the session immediately, frontier empty or not. Ask nothing
  further and do no further work. Report the open decisions as open, not
  assumed.
- **proceed** / **done** ends the asking, not the session's own work. Finish
  every lookup still running first, and record any decision it then raises the
  same way. The closure covers the tree as it finally stands, not only the nodes
  open when it arrived: a lookup that lands afterwards can expose a decision, and
  a record written before it lands omits exactly that one. Then continue, with
  each decision still open recorded as an assumption and labelled as one.

**Two kinds of node are never assumed, whatever the user answered.** A decision
some document requires the user to make and record — an SDD triage `Approved By`
among them — and an input declared `hard-required` are outside the assumption
path. They are still asked, and where a no-question mode forbids asking, the run
stops and names them instead. Closing the questions waives the agent's own
uncertainty, never an authorization the user has not given.

## When talking cannot settle it

A question about how something should look, or how it should feel to use, needs
something to react to, and no number of rounds produces that.

Stop grilling and build something to react to. Then put it in front of the user
and ask the original question again against it. **Their** reaction is the answer,
and the questions it raises are a new frontier.

The artifact makes the decision answerable; it does not transfer ownership of it.
An agent that builds a sketch, judges it and carries on has settled a question of
taste on the user's behalf, which is the thing every round of this method spends
its effort avoiding.

What that artifact is belongs to the stage the session is running in. This skill
does not choose it and does not move the work to another stage: a sketch inside
the current stage is the usual answer, and reaching for a later stage's artifact
is that stage's own decision, under its own preconditions.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`. The
sections below add only what is specific to a session; where they and the
baseline overlap, the baseline governs.

One thing is delegated and one only: reading a fact the environment holds. The
questions are never delegated — a round is put by the agent that holds the
session, to whoever is answering it.

Who that is depends on the mode. In a session with a user, it is the user, and
the agent they are talking to is the one that asks. In a session between agents
there is no user to reach, so the griller puts the round to the authors and the
orchestrator holds both. That is a different answerer, not a delegated question:
nothing hands the asking to a third agent, and the orchestrator still answers
nothing itself.

A round between agents may have several authors, because one frontier can hold
decisions belonging to different drafting roles.

- The round goes to **every author whose decisions it contains**, each seeing
  the whole round. A decision reads differently beside the ones next to it, and
  an author shown only its own share cannot say so.
- **Every answer is collected before the frontier is recomputed.** Recomputing
  on the first reply settles the rest against a tree that moved under them.
- **Two authors answering one question differently is itself a decision**, and
  it joins the frontier rather than being averaged or decided by the griller. If
  the budget ends with it open, it escalates like any other.
- **A fact only the user holds goes to the user, not to an author.** No author
  can answer an unpublished constraint or an intention nobody wrote down, and
  the convergence rules escalate decisions rather than facts — so without this
  the fact sits on the frontier until the budget ends, taking every decision
  waiting on it with it. It escalates immediately, as a request for the value
  rather than a choice. Under a no-question mode it reaches nobody, and what
  follows depends on the fact rather than on its kind: where the consuming
  document declares the value undefaultable the run stops and names it
  (`.qfai/assistant/constitution/constitution.md` Article X, rule 4), and where
  the document has a default that default is recorded as a labelled assumption
  beside the open question, which is the ordinary no-question path. Stopping on
  every user-held fact would block a run over a defaultable date.

### Orchestrator Protocol (MUST)

- The orchestrator computes the frontier and reads the answers. It does not
  decide a frontier question on anyone's behalf.
- **Who puts the round depends on the mode, and exactly one role does.** With a
  user, the orchestrator puts it. Between agents, the griller puts it and the
  orchestrator does not — a session where both do is one where an author is
  asked twice and the two answers have no tie-break.
- It MUST NOT record an answer **as the user's** that the user did not give, and
  MUST NOT self-approve the session's end condition. An author's answer in an
  agent-to-agent round is recorded as that author's position, with whose it is:
  the round cannot be recomputed, a disagreement cannot be kept, and an
  escalation cannot carry the positions to the user unless the answers are
  held. A position is not a settled decision, and only the user's answer or
  authoritative evidence makes one.

### Capability Probe (MUST)

1. Attempt the first fact lookup a decision waits on at session start.
2. Treat that real delegation attempt as the capability check.
3. If it fails, classify per the baseline taxonomy before doing anything else.

### Delegation Failure (Hard Stop)

- `unavailable`: stop dispatching lookups and read what can be read directly,
  under the baseline's sanctioned exception for a read-only fact lookup
  (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md`). This is
  not an override of the hard stop — the exception is what permits it, and it
  permits reading only. Report the class, report every fact that stayed unread,
  and hold the decisions downstream of it open rather than asking the user for
  it.
- `saturated`: use the baseline's bounded retry branch. The session stays open.
- Do not simulate roles. An agent that answers a dispatched lookup out of its
  own recollection has recorded a guess as a fact, which the frontier then
  treats as settled.

## Work Orders Summary

A session that dispatched any lookup MUST record a `## Work Orders Summary`
table in the artifact its invoking stage writes. Use the shared schema from
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md`, including
the `Agent instance` column.

| Step | Role (sub-agent) | Agent instance  | Task title                      | Input (refs)                    | Output (refs)                   | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ------------------------------- | ------------------------------- | ------------------------------- | ---------------------------- |
| 1    | Reviewer         | `<instance id>` | Read the facts a round waits on | Decision and what it depends on | The fact, and where it was read | PASS/REVISE                  |

### Reviewer Gate (MUST)

This skill produces no artifact, so the gate that covers a session is the
invoking stage's. What it confirms about the session is:

- no decision was recorded that the user did not answer, and none was assumed
  that the assumption path excludes;
- a fact taken as settled names where it was read;
- the session ended on its own condition or on the user's word — or, between
  agents, on the round budget that is the one place a count ends a session
  (`.qfai/assistant/constitution/review-convergence.md`). A count anywhere else
  is the finding.

- Reviewer independence is defined normatively in
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#definition-independent-reviewer-normative`.
  An agent that answered a lookup in this session is disqualified from reviewing
  the facts it supplied.
- Reviewer checks the Drift Protocol, verifies alignment with `test-layers.md`,
  and treats ratios as signals, not gates.
- Reviewer returns only `PASS` or `REVISE`, with a concrete fix proposal on
  `REVISE`. A gate that could not be run at all is recorded as `PENDING`, which
  never counts as `PASS`.

A session run from the user-invoked entry point has no invoking stage. There the
gate is the user reading the record, which is why that entry point writes no
files.

## Default Autopilot Policy

Every decision this skill meets falls in one of three named buckets.

- auto-decide:
  - output formatting
  - equivalent-option pick
- ask-user:
  - every decision on the frontier — that is what a round is
  - the confirmation that closes the session
- hard-required:
  - grilling subject (the design to interrogate; a session has no default for
    what it is about)

The asking is what this skill performs, so its `ask-user` entries are its own operations
rather than an entry added to the prototype. A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry — `approval-required governance operations` — with the
operations its own run cannot authorize for itself. `hard-required` also takes the
undefaultable inputs this skill itself consumes, declared per skill and checked against
that declaration; the bucket is what a run cannot proceed without, and no prototype can
enumerate that for a skill it does not know. Otherwise a skill MUST NOT introduce an
entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

The buckets are the method, not a tuning surface. Moving a frontier decision to
`auto-decide` is the agent answering its own question, which this skill exists
to stop.

## Related

- Question form and the fallback without the tool:
  `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`
- The clarification budget and its exemptions:
  `.qfai/assistant/constitution/constitution.md#article-vi--clarification-budget-avoid-endless-qa`
- Rejected options and drift: `.qfai/assistant/constitution/drift-protocol.md`

project_memory:

- A grilling question spends no clarification budget, and the confirmation that closes a session is exempt with it. A session ends on its own condition, never at a count.
- A decision the user owns is asked, never assumed. A fact the environment holds is read, never asked.
- A no-question mode silences the questions, not the session: such a run settles what the evidence settles and opens every decision left over as a question, with a labelled value beside it where a document requires one. The assumption alone is forbidden.
- A user's `stop` ends a session immediately and the open decisions are reported as open. A mandatory approval and a `hard-required` input are never assumed, whatever the user answered.
