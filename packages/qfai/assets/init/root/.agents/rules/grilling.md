# Grilling

An interview that settles a plan before anyone acts on it.

This rule does not decide what to build and does not replace a specification.
What it decides is the order questions are asked in, who answers each one, and
when asking stops.

## Scope

A **grilling session** is a mode entered deliberately. An invocation declares
one; nothing else starts one. Meeting an unfixed design does not, and neither
does an ambiguity found while implementing.

| Target                            | Applies                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| A session, once entered           | Every round, until it ends                                         |
| A critical decision               | Asked, never assumed, in every session                             |
| Any other decision                | Asked in a user session; in a delegated one, the recommendation    |
| A fact the environment can settle | Never asked; looked up                                             |
| A fact only the user holds        | Asked as a value, never with a recommended answer                  |
| A question outside a session      | Not a grilling question — an ordinary clarification, capped as one |
| Work already specified            | Outside this rule; the spec is the authority                       |

The sixth row is what keeps the rest from being a way around a question budget.
It also makes the class decidable when the question is asked rather than
arguable afterwards.

Reach for a session whenever a decision is about to be made that the repository
cannot settle by itself: a design, an approach, a scope boundary, a trade-off
between things that both matter. A session turns those into decisions someone
made on purpose, instead of defaults nobody chose.

Vagueness is not a reason to postpone one. It is what the session is for. What
ends the need is the decision being settled, not the subject being easy to
state: a choice between two fully specified options is precise and still open,
and precision is no help whatever in making it.

## Two kinds of session

| Kind      | Held by                                                       | Who answers                           | What reaches the user   |
| --------- | ------------------------------------------------------------- | ------------------------------------- | ----------------------- |
| User      | A stage whose work is the interview, or the user invoking one | The user                              | Every decision          |
| Delegated | Every other stage                                             | The authors, interviewed by a griller | Critical decisions only |

**Delegated is the default.** A stage holds a user session only where its own
definition says so. The discussion stage is that stage: there the interview is
the work.

A user asked every design question of a routine stage answers most of them by
accepting the recommendation. Each round trip costs their time and settles
nothing the recommendation had not. Their attention is spent where their answer
can differ from it: the discussion stage, and the critical decisions below.

**A delegated session runs the same method with a different answerer.** The
griller builds the tree, computes the frontier and puts each round to the
authors whose decisions it holds. After two rounds every decision that is not
critical takes the griller's recommendation, whether the authors agreed with it
or not. Each critical one goes to the user.

### Critical decisions

A decision is critical, and goes to the user in every session, when it is one of
these.

| Class                                                                                                                                                    | Why agents cannot take it                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| It contradicts a spec, a contract or a recorded decision                                                                                                 | Changing settled input is a change request, which the user approves |
| Its effect cannot be taken back: a security exposure, lost or corrupted data, a broken released contract, spending, a legal commitment, a public release | A wrong recommendation here is not repaired by the next run         |
| It rests on product or business intent that the request, the discussion pack, the specs and the contracts all leave unstated                             | The agents would be inventing what the user wants                   |

Two more nodes reach the user in every session, and neither is a decision the
agents could recommend: a decision some document requires the user to make and
record, and a fact only the user holds.

Nothing else is critical. Doubt about a recommendation is not criticality: the
rounds are where the agents weigh it, and the record lets the user overturn it.

### What an adopted decision owes

- **A record** in the stage's evidence: the decision, the recommendation taken,
  the agent that made it, and why. A position that disagreed stays beside it.
- **A line in the stage's final report**, with every other adopted decision, so
  the user sees all of them without being stopped for any.

The report does not wait for an answer. A user who disagrees overturns the
decision the ordinary way: a change request, or a rerun with the decision
stated.

## The request bounds the tree

A node belongs on the tree only when the requested work cannot go ahead without
its answer.

A decision whose only outcome is whether to add something the request did not
ask for — a control, a setting, a code path, a layer of abstraction, a case
nobody named — is not a node. Leave the thing out, and do not ask. Asking turns
a request into a menu, and a menu answered "as recommended" builds all of it.

- Among the options for a real node, recommend the one that adds least beyond
  what was asked.
- In a delegated session the griller asks, of every addition an author
  proposes, which part of the request needs it. An addition nobody can point to
  is dropped, not adopted.
- The discussion stage is where the request is shaped, so a question about scope
  is a node there. Its recommendation still favours the smaller scope.

## The design tree

The subject sits at the root, and below it hang nodes, each on whatever it
depends on.

| Node                       | Settled by                                                     | State while open |
| -------------------------- | -------------------------------------------------------------- | ---------------- |
| Decision                   | The user, or in a delegated session the adopted recommendation | Open             |
| Fact the environment holds | The agent, by reading or a lookup                              | Open, in flight  |
| Fact only the user holds   | The user, when asked                                           | Open             |

**A decision that selects a source opens one node before the options.** Where a
node decides where a capability or a body of reference data comes from, the tree
carries a node above it asking what already provides it: the standard library,
the platform, a dependency the project already carries, or a package somebody
maintains. It is settled by looking, not by asking, and its answer is recorded
with its evidence like any other. Without it a session enumerates the shapes the
repository holds, reaches an empty frontier across them, and escalates a choice
among three in-repository options while the answer nobody built sits outside the
tree. `minimal-implementation.md` holds the rungs that node runs.

**A fact the environment does not hold is still a fact.** An unpublished date, a
constraint that lives in a contract, a number only the user knows: no lookup
reaches it. Ask for it as the value it is, and **with no recommended answer** —
nothing is being decided, so there is nothing to recommend. Recorded as a
preference it becomes revisable, and a fact is not.

Whether it arrives as options is a separate question, and the candidate set
answers it: a fact with a known few possible values is asked as a choice among
them, and one with no such set as a plain request. Asking which of four
supported regions is active as free text loses the four.

The tree is not written once. Each answer changes what the remaining nodes are,
so it is the current state of what is settled and what is not, never a plan made
at the start.

## The frontier

The frontier is every node that can be settled now: every decision whose
prerequisites are all settled, and every user-held fact whose own prerequisites
are settled.

A user-held fact belongs there because nothing else can put it there. Left off,
the decision below it waits on a node no round ever asks, the frontier never
empties, and the session cannot end.

Those are the only questions that can honestly be asked yet. A question whose
answer depends on an unanswered one cannot be answered, only guessed at — and a
guess recorded as an answer is worse than an open question, because nothing
later re-opens it.

## A round

One round is one frontier: asked in full, answered in full.

- Two questions never share a round when one depends on the other. The dependent
  one belongs to a later round.
- Every question in the round is put at once, so whoever answers sees the whole
  of what is being decided together.
- The next round is recomputed from the answers, never written ahead of them.

Count rounds, not questions. Forty questions across four rounds is an ordinary
session; the same forty asked one at a time is a worse one.

**A no-question mode is read before any of this.** Where the invocation is told
not to ask, no round is put at all, so nothing here applies and _Under a
no-question mode_ below governs. A mode that withholds the tool while still
permitting questions is a different thing, and is the fallback's case.

In a delegated session the griller puts each round to the authors, and only a
critical decision reaches the user, asked the way the rest of this section says.

Ask the user through the host's structured question tool. Three things send a round to
plain text instead: the host has no such tool, the current mode withholds it
while still permitting questions, or it cannot carry the answer shape of some
question in the round — a question
permitting several answers put to a tool whose options are exclusive is the
common case, and forcing it through loses the constraint.

**The whole round falls back, not the question that triggered it.** Splitting a
round across two carriers costs the thing a round exists for: the user seeing
what is being decided together. So the round is asked as a normal message **in
the shape each answer has** — numbered choices where a listable set of candidates
exists, a plain request for the value where none does — keeping the choice
semantics where there are choices, and saying why the tool was not used. The
classifier is the candidate set, not whether the question asks for a fact: a
fact with four supported values is a choice, and `user-questions.md` states the
whole of that.
Where the reason is the third one, say which question it could not carry: the
other two are about the tool, and naming a question there would invent a cause.
`user-questions.md` § 5 owns the rest of that fallback.
A session is never skipped for want of a tool.

**Where the tool takes fewer questions than the round holds**, deliver the round
in host-sized batches. The frontier is not recomputed between them, no answer is
acted on until the round is exhausted, and each batch is read for a closing
answer before the next is put. Batching is how one round reaches a host that
cannot show it whole; it never makes two rounds, and `user-questions.md` § 4
carries the rest of its mechanics.

## The shape of a question

Each question is numbered, carries a short title, and states the recommended
answer on a line of its own. That shape is what makes a round answerable by
number: a user who agrees with every recommendation says so once, and a user who
disagrees with the third names the third.

Without a recommendation the user has to reconstruct the reasoning before they
can disagree with it, and most rounds are long enough that they will stop
reading instead.

**A question asking for a fact carries no recommended answer.** There is nothing
to recommend: the agent does not hold the value, a guessed one is the corruption
the tree warns about, and offering it invites the user to accept it. Name the
fact, say what depends on it, and leave the answer to them.

**A value with no candidates goes through the tool's free-text path.**
`user-questions.md` § 2 names that path for exactly this shape. Where the round
falls back to plain text the value is put as a plain request instead — for one
of the three reasons above, never because the answer is a value. Reaching past a
free-text path the tool has drops the structure for nothing. Where the
candidates are listable the question is a choice, which the classifier above
already settles.

## Facts are yours, decisions are theirs

A fact the environment can settle is your job. Read the file, run the command,
dispatch a sub-agent. Never ask the user for something you could look up.

**The environment is not only this repository.** What a standard library, a
platform, an installed dependency or a maintained package already provides is a
fact of the same kind, and it is looked up rather than asked. A session whose
evidence stops at the repository's own edge cannot reach the answer somebody
else already built, and that answer is the one the sourcing node above exists
for.

Do not block on it either. A running exploration is an unsettled prerequisite,
so only the questions downstream of it wait; ask the rest of the frontier now.

In a user session a decision is the user's, and you wait for it. An agent that
answers its own decisions there has not read this rule liberally — it has
stopped following it.

In a delegated session a decision takes the griller's recommendation, reached in
rounds and recorded. The agent holding the session still never skips the rounds,
and never takes a critical decision.

## When a session ends

A session **completes** on both of these:

1. No node is open. The frontier is empty **and** no lookup is still running.
2. The user confirms the understanding is shared.

Condition 1 is about the whole tree. When every remaining decision waits on a
lookup, the frontier is empty while the tree still holds open nodes, and
completing there would close the session before the lookup could raise the
questions it was dispatched to answer.

Running out of questions is not the same as being finished. Do not act on what
was agreed until the confirmation in step 2.

A delegated session has no confirmation to wait for. It **completes** when no
node is open and every critical decision has the user's answer, and it ends
`adopted`.

There is no question cap, and adding one would not help: some plans need three
questions and some need fifty, so a fixed ceiling either truncates the hard case
or looks arbitrary on the easy one. When a session runs long the cause is
usually a subject too large to hold at once. Break it up and grill the pieces.

### The five endings

A session ends in exactly one of these, and a record of one names which:

| Ending        | Reached when                                                                                                   | The work may proceed                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `confirmed`   | Both conditions above: no node open, and the user confirms                                                     | Yes                                                      |
| `user-closed` | The user answered `proceed` or `done`; each decision still open is recorded as an assumption and labelled      | Yes                                                      |
| `adopted`     | A delegated session: no node open, every critical decision answered by the user, the rest adopted and recorded | Yes, and the final report lists what was adopted         |
| `no-question` | A no-question mode was active: the evidence settled what it could and every node left over is an open question | Yes, and whatever gates the work reports those questions |
| `stopped`     | The user stopped the session                                                                                   | No. Report every open decision as open                   |

**`no-question` is an ending, not an exemption.** The completing condition needs
the user's confirmation, and an invocation told not to ask cannot obtain one —
so without a name for how such a run finishes, a session it was required to hold
could never end, and the rule would forbid the mode it elsewhere describes. What
stops that run from being treated as agreed is the open questions it leaves, not
the absence of an ending.

**A session between agents is a delegated session, and ends `adopted`.** Its
budget ends the rounds: after two, every decision that is not critical takes the
griller's recommendation, and every critical one goes to the user, who answers
it or ends the session another way. **Under a no-question mode there is nobody
to send them to**: they are opened as questions where the work's gates read
them, and that register write ends the session `no-question`, as it ends any
session the mode holds. How many went is a count a record carries, never an
ending of its own.

**`stopped` is the one that does not let the work continue.** The other four
close the asking; this one ends the session, and an agent that carried on
because the frontier happened to be empty has read the stop as an answer.

### When the user ends it

Completing is how a session ends on its own. It is not the only way one ends.

A user's **stop** ends it immediately, frontier empty or not: ask nothing
further, do no further work, and report every open decision as open. Nothing
above outranks that, and an agent that kept asking because condition 1 was unmet
has read this rule as licence to ignore the user.

A user who closes the questions instead — **proceed**, **done**, or an answer to
that effect — ends the asking, not the work. Each decision still open is
recorded as an assumption and labelled as one. A lookup still running is
finished, and a decision it then raises is recorded the same way: the closure
covers the tree as it finally stands, not only the nodes open at the moment it
arrived.

Two kinds of node are never assumed when the questions close: a decision some
document requires the user to make and record, and an input declared
undefaultable. Both are still asked, and a run missing the second stops rather
than inventing it.

### A session between agents

Two rounds, then every decision that is not critical takes the griller's
recommendation. A critical decision skips the rounds and goes to the user at
once: rounds between agents produce agreement, and agreement is not what that
class lacks. Under a no-question mode the critical decisions reach no user: they
are opened as questions, and the session ends `no-question` on that write.

The count bounds the rounds between agents. It does not end the session while a
critical decision is unanswered. The rules are in
`.qfai/assistant/rule/review-convergence.md`.

## Under a no-question mode

A run told not to ask the user does not ask, and a session inside it does not
either. It settles what the evidence settles — and in a delegated session what
adoption settles — and opens **every node left over** as a question, where
whatever gates the work will see it. Every node, not every
decision: a fact only the user holds cannot be settled from evidence either, and
a mode that opens the decisions and drops the facts loses exactly the nodes no
lookup could have reached.

Where a document requires the field to hold something, write the defaulted value
and label it an assumption beside the open question. What is forbidden is the
assumption on its own: unread, it is a decision nobody took, wearing the face of
one somebody did.

**A fact declared undefaultable stops the run.** There is no value to write
down: the agent does not hold it, a guessed one is the corruption the tree warns
about, and an open question beside a defaulted value is not available where the
field admits no default. The run stops and names the fact, which is the same
answer `user-questions.md` gives when a closure leaves one of these standing.

## What talking cannot settle

Some questions need something to react to. "How should this feel" and "one long
form or three pages" are of that kind, and no amount of rephrasing turns them
into answerable ones. Stop grilling and build the throwaway version.

In a delegated session such a question is one of product intent unless the
discussion stage's design direction already answers it, so it is critical.

Then put it in front of the user and ask the question again against it. The
prototype is what makes the decision answerable; it does not transfer the
decision. An agent that builds one, judges it, and carries on has settled a
question of taste on the user's behalf, which is the thing this rule spends
every round avoiding.

Talking through such a question is where a session balloons: you keep
rephrasing, the user keeps guessing, and the scope grows to fill the
uncertainty.

## It is working when

- In a user session, every decision the session opened is either settled by the
  user or left open on purpose, and they said which. Agreeing with every
  recommendation is a fine outcome; a decision that closed without them is not,
  however sound it was.
- In a delegated session, the user was asked the critical decisions and nothing
  else, and every adopted decision is in the record and the final report.
- Nothing entered the tree that the request did not need.
- Later rounds ask what the first round could not have asked.
- Facts were looked up rather than asked for.
- Work running in the background did not stall the round — only the questions
  downstream of it waited.
- The session reached one of the five endings on purpose. `confirmed` is the
  one that asks for confirmation rather than starting work; the other four are
  reached when the user closes the asking, when a delegated session adopts, when
  a no-question mode forbids asking, and when the user stops — and a run that
  could not have asked is not failing this list by not asking.

## Related

- The form each question in a round arrives in: `user-questions.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
