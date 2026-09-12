# Grilling

An interview that settles a plan before anyone acts on it.

Reach for it whenever a decision is about to be made that the repository cannot
settle by itself: a design, an approach, a scope boundary, a trade-off between
things that both matter. A session turns those into decisions someone made on
purpose, instead of defaults nobody chose.

Vagueness is not a reason to postpone a session. It is what the session is for.
When the subject can already be specified precisely, there is nothing to grill.

## Three pieces

| Piece       | What it is                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Design tree | The subject modelled as decisions, with decisions hanging off them                             |
| Frontier    | Every decision whose prerequisites are settled — the only questions that can honestly be asked |
| Round       | One frontier, asked in full and answered in full                                               |

Two questions never share a round if one depends on the other. A question that
hinges on an answer still open belongs to a later round.

Each round's answers reshape the tree: settled decisions push the frontier
outward and unblock the questions that waited on them. Recompute the frontier
and ask the next round. A later round is computed from the answers, never
written in advance.

Count rounds, not questions. Forty questions across four rounds is an ordinary
session; the same forty asked one at a time is a worse one.

## Asking a round

Every question in a round has the same shape:

- a number and a short title, so the round can be answered by number;
- the question itself, with the options where there are options;
- **the recommended answer**, and why it is the one to pick.

The recommendation is not a formality. Without it the user has to reconstruct
the reasoning before they can disagree with it, and most rounds are long enough
that they will stop reading instead.

Ask through the host's structured question tool. When a round carries more
questions than one call accepts, split it across consecutive calls until the
round is exhausted. The split is presentation: it neither reorders the questions
nor defers any of them to a later round.

Where the host has no such tool, or it is unavailable in the current mode, ask
the same round as a normal message with numbered choices, keep the choice
semantics, and say why the tool was unavailable. A session is never skipped for
want of a tool.

## Facts are yours, decisions are theirs

A fact the environment can settle is your job. Read the file, run the command,
dispatch a sub-agent. Never ask the user for something you could look up.

Do not block on it either. A running exploration is an unsettled prerequisite,
so only the questions downstream of it wait; ask the rest of the frontier now.

A decision is the user's, and you wait for it. An agent that answers its own
decisions has not read this rule liberally — it has stopped following it.

## When a session ends

Both of these, together:

1. The frontier is empty. Every branch has been visited and nothing is left
   silently assumed.
2. The user confirms the understanding is shared.

Running out of questions is not the same as being finished. Do not act on what
was agreed until the confirmation in step 2.

There is no question cap, and adding one would not help: some plans need three
questions and some need fifty, so a fixed ceiling either truncates the hard case
or looks arbitrary on the easy one. When a session runs long the cause is
usually a subject too large to hold at once. Break it up and grill the pieces.

## Under a no-question mode

A run told not to ask the user does not ask, and a session inside it does not
either. It settles what the evidence settles, and opens every decision left over
as a question, where whatever gates the work will see it.

Where a document requires the field to hold something, write the defaulted value
and label it an assumption beside the open question. What is forbidden is the
assumption on its own: unread, it is a decision nobody took, wearing the face of
one somebody did.

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

- Some recommendations are turned down. A session with no pushback from the user
  is a session that was not needed.
- Later rounds ask what the first round could not have asked.
- Facts were looked up rather than asked for.
- Work running in the background did not stall the round — only the questions
  downstream of it waited.
- The session ended by asking for confirmation, not by starting work.

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
