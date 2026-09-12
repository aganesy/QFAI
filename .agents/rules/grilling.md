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
| A decision the user owns          | Asked, never assumed                                               |
| A fact the environment can settle | Never asked; looked up                                             |
| A fact only the user holds        | Asked as a value, never with a recommended answer                  |
| A question outside a session      | Not a grilling question — an ordinary clarification, capped as one |
| Work already specified            | Outside this rule; the spec is the authority                       |

The fifth row is what keeps the rest from being a way around a question budget.
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

## The design tree

The subject sits at the root, and below it hang nodes, each on whatever it
depends on.

| Node                       | Settled by                        | State while open |
| -------------------------- | --------------------------------- | ---------------- |
| Decision                   | The user, when asked              | Open             |
| Fact the environment holds | The agent, by reading or a lookup | Open, in flight  |
| Fact only the user holds   | The user, when asked              | Open             |

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
- Every question in the round is put at once, so the user sees the whole of what
  is being decided together.
- The next round is recomputed from the answers, never written ahead of them.

Count rounds, not questions. Forty questions across four rounds is an ordinary
session; the same forty asked one at a time is a worse one.

**A no-question mode is read before any of this.** Where the invocation is told
not to ask, no round is put at all, so nothing here applies and _Under a
no-question mode_ below governs. A mode that withholds the tool while still
permitting questions is a different thing, and is the fallback's case.

Ask through the host's structured question tool. Three things send a round to
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

Do not block on it either. A running exploration is an unsettled prerequisite,
so only the questions downstream of it wait; ask the rest of the frontier now.

A decision is the user's, and you wait for it. An agent that answers its own
decisions has not read this rule liberally — it has stopped following it.

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

There is no question cap, and adding one would not help: some plans need three
questions and some need fifty, so a fixed ceiling either truncates the hard case
or looks arbitrary on the easy one. When a session runs long the cause is
usually a subject too large to hold at once. Break it up and grill the pieces.

### The four endings

A session ends in exactly one of these, and a record of one names which:

| Ending        | Reached when                                                                                                   | The work may proceed                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `confirmed`   | Both conditions above: no node open, and the user confirms                                                     | Yes                                                      |
| `user-closed` | The user answered `proceed` or `done`; each decision still open is recorded as an assumption and labelled      | Yes                                                      |
| `no-question` | A no-question mode was active: the evidence settled what it could and every node left over is an open question | Yes, and whatever gates the work reports those questions |
| `stopped`     | The user stopped the session                                                                                   | No. Report every open decision as open                   |

**`no-question` is an ending, not an exemption.** The completing condition needs
the user's confirmation, and an invocation told not to ask cannot obtain one —
so without a name for how such a run finishes, a session it was required to hold
could never end, and the rule would forbid the mode it elsewhere describes. What
stops that run from being treated as agreed is the open questions it leaves, not
the absence of an ending.

**A session between agents reaches none of these on its own.** Its budget ends
the rounds between agents, not the session: every decision still open goes to
the user, who ends it in one of the four. How many went is a count a record
carries, never an ending of its own.

**`stopped` is the one that does not let the work continue.** The other three
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

A session with no user answering has neither half of the end condition above
available to it. **The budget does not supply one.** Two rounds, then every
decision still open goes to the user — and the session is still open when it
gets there, because the user has not yet ended it in any of the four ways. Three
subjects skip the rounds and go at once — product or business intent no
authoritative artifact answers, a decision contradicting a spec, a contract or a
recorded decision, and a decision resting on nothing authoritative.

So the count bounds the rounds between agents and nothing else. It is not a
fifth ending, and an agent that closed the session on reaching it has ended one
the user was never asked to end. The rules are in
`.qfai/assistant/constitution/review-convergence.md`.

## Under a no-question mode

A run told not to ask the user does not ask, and a session inside it does not
either. It settles what the evidence settles, and opens **every node left over**
as a question, where whatever gates the work will see it. Every node, not every
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

Then put it in front of the user and ask the question again against it. The
prototype is what makes the decision answerable; it does not transfer the
decision. An agent that builds one, judges it, and carries on has settled a
question of taste on the user's behalf, which is the thing this rule spends
every round avoiding.

Talking through such a question is where a session balloons: you keep
rephrasing, the user keeps guessing, and the scope grows to fill the
uncertainty.

## It is working when

- Every decision the session opened is either settled by the user or left open on
  purpose, and they said which. Agreeing with every recommendation is a fine
  outcome; a decision that closed without them is not, however sound it was.
- Later rounds ask what the first round could not have asked.
- Facts were looked up rather than asked for.
- Work running in the background did not stall the round — only the questions
  downstream of it waited.
- The session reached one of the four endings on purpose. `confirmed` is the
  one that asks for confirmation rather than starting work; the other three are
  reached when the user closes the asking, when a no-question mode forbids it,
  and when the user stops — and a run that could not have asked is not failing
  this list by not asking.

## Related

- The form each question in a round arrives in: `user-questions.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
