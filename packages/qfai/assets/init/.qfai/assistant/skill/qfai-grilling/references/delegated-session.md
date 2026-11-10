# Delegated session

How the session agent runs a round between agents: who is asked, how the
answers are held, which agent puts the round, and when the session ends.

## The author

The session agent authors every draft, so a round between agents has one
author: the session agent. The griller is a `requirements-reviewer`, or an
`architecture-reviewer` where the decision is a contract or architecture
decision, started from a fresh context and a black-box brief.

- The round shows the author **the whole round**. A decision reads differently
  beside the ones next to it.
- **Every answer is collected before the frontier is recomputed.** Recomputing
  on the first reply settles the rest against a tree that moved under them.
- **An author answer that differs from the griller's recommendation is kept**,
  with both positions recorded. If the budget ends with it open, it takes the
  griller's recommendation like any other non-critical decision.
- **An addition the author proposes is asked what part of the request needs
  it.** One nobody can point to is dropped, not adopted.
- **A fact only the user holds goes to the user, not to the author.** No author
  can answer an unpublished constraint or an intention nobody wrote down, and
  the convergence rules escalate decisions rather than facts — so without this
  the fact sits on the frontier until the budget ends, taking every decision
  waiting on it with it. It escalates immediately, as a request for the value
  rather than a choice. Under a no-question mode it reaches nobody, and what
  follows depends on the fact rather than on its kind: where the consuming
  document declares the value undefaultable the run stops and names it
  (`.qfai/assistant/rule/constitution.md` Article X, rule 4), and where
  the document has a default that default is recorded as a labelled assumption
  beside the open question, which is the ordinary no-question path. Stopping on
  every user-held fact would block a run over a defaultable date.

## Session agent protocol

- The session agent computes the frontier and reads the answers. It does not
  decide a frontier question on anyone's behalf.
- **Who puts the round depends on the mode, and exactly one role does.** With a
  user, the session agent puts it. Between agents, the griller puts it and the
  session agent does not — a session where both do is one where an author is
  asked twice and the two answers have no tie-break.
- It must not record an answer **as the user's** that the user did not give, and
  must not self-approve the session's end condition. An author's answer in an
  agent-to-agent round is recorded as that author's position, with whose it is:
  the round cannot be recomputed, a disagreement cannot be kept, and an
  escalation cannot carry the positions to the user unless the answers are
  held.
- **In a delegated session the griller's recommendation settles a decision that
  is not critical.** Where the session agent and the griller land on one answer, or
  the budget ends first, the recommendation is taken and the stage records it as
  `agents`, with the reason and every disagreeing position. The stage's final
  report lists it; nothing waits for the user to read it.

  A critical decision is the exception: agreement closes its node for the
  round, but only an actual user answer or an explicit applicable authorization
  under `.agents/rules/grilling.md#explicit-delegation-for-a-discussion` settles
  it. Record that authority separately from the agents' positions. Agreement
  alone does not settle it, and an unknown user-held fact still stays open.

## When a delegated session ends

**A delegated session has no condition 2**, because no user is there to
confirm. A budget bounds its rounds: two, then every decision that is not
critical takes the griller's recommendation — the ones the agents agreed on and
the ones still open alike. An uncovered critical decision goes to the user
when asking is permitted, without spending a round
(`.qfai/assistant/rule/review-convergence.md`). It ends `adopted` once
the master's conditions hold: no open node or lookup, required inputs present,
and actual authority for critical decisions. Record agent choices as agents'.

**The budget ends the rounds, not the session.** While a critical decision
lacks an actual answer or applicable recorded authorization, it stays open: the
user answers it, or ends the session another way — or, under a no-question
mode, the register write ends it `no-question`. How many went is a count a
record carries, never an ending.

**Only a no-question session meeting the master's explicit-delegation
conditions ends `adopted`.**
