# Delegated session

How the session agent runs a round between agents: who is asked, how the
answers are held, and which role puts the round.

## Several authors

A round between agents may have several authors, because one frontier can hold
decisions belonging to different drafting roles.

- The round goes to **every author whose decisions it contains**, each seeing
  the whole round. A decision reads differently beside the ones next to it, and
  an author shown only its own share cannot say so.
- **Every answer is collected before the frontier is recomputed.** Recomputing
  on the first reply settles the rest against a tree that moved under them.
- **Two authors answering one question differently is itself a decision**, and
  it joins the frontier rather than being averaged. If the budget ends with it
  open, it takes the griller's recommendation like any other non-critical
  decision, with both positions recorded.
- **An addition an author proposes is asked what part of the request needs
  it.** One nobody can point to is dropped, not adopted.
- **A fact only the user holds goes to the user, not to an author.** No author
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

## Orchestrator protocol

- The orchestrator computes the frontier and reads the answers. It does not
  decide a frontier question on anyone's behalf.
- **Who puts the round depends on the mode, and exactly one role does.** With a
  user, the orchestrator puts it. Between agents, the griller puts it and the
  orchestrator does not — a session where both do is one where an author is
  asked twice and the two answers have no tie-break.
- It must not record an answer **as the user's** that the user did not give, and
  must not self-approve the session's end condition. An author's answer in an
  agent-to-agent round is recorded as that author's position, with whose it is:
  the round cannot be recomputed, a disagreement cannot be kept, and an
  escalation cannot carry the positions to the user unless the answers are
  held.
- **In a delegated session the griller's recommendation settles a decision that
  is not critical.** Where the authors and the griller land on one answer, or
  the budget ends first, the recommendation is taken and the stage records it as
  `agents`, with the reason and every disagreeing position. The stage's final
  report lists it; nothing waits for the user to read it.

  A critical decision is the exception: agreement closes its node for the
  round, but only an actual user answer or an explicit applicable authorization
  under `.agents/rules/grilling.md#explicit-delegation-for-a-discussion` settles
  it. Record that authority separately from the agents' positions. Agreement
  alone does not settle it, and an unknown user-held fact still stays open.
