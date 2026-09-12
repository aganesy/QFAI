# Grilling

How a design is interrogated before it is fixed.

This rule does not decide what to build, and it does not replace a
specification. What it decides is the order questions are asked in, who answers
each one, and when asking stops.

## Scope

| Target                            | Applies                                          |
| --------------------------------- | ------------------------------------------------ |
| A design not yet fixed            | Every round, until the end condition below holds |
| A decision the user owns          | Always asked, never assumed                      |
| A fact the environment can settle | Never asked; looked up                           |
| Work already specified            | Outside this rule — the spec is the authority    |

## 1. The design tree

The subject sits at the root. Below it hang two kinds of node, and a node hangs
off whatever it depends on:

| Node     | Settled by                                    | State while open |
| -------- | --------------------------------------------- | ---------------- |
| Decision | The user, when asked                          | Open             |
| Fact     | The agent, by reading or dispatching a lookup | Open, in flight  |

Both kinds are prerequisites, so a decision that waits on a fact is on the tree
as exactly that. Without the second kind the model cannot say which questions a
running lookup holds up, and §5's rule about that would have nothing to point
at.

The tree is not written once. Each answer changes what the remaining nodes are,
so the tree is the current state of what is settled and what is not, not a plan
made at the start.

## 2. The frontier

The frontier is every decision whose prerequisites are all settled — every
decision it depended on answered, and every fact it depended on read.

Those are the only questions that can honestly be asked yet. A question whose
answer depends on an unanswered one cannot be answered — it can only be guessed
at, and a guess recorded as an answer is worse than an open question, because
nothing later re-opens it.

## 3. A round

One round is one frontier: asked in full, answered in full.

- Two questions never share a round when one depends on the other. The
  dependent one belongs to a later round.
- Every question in the round is put at once, so the user sees the whole of
  what is being decided together.
- The next round is recomputed from the answers. It is never written ahead of
  them.

## 4. The shape of a question

Each question is numbered, carries a title, and states the recommended answer on
a line of its own.

That shape is what makes a round answerable by number. A user who agrees with
every recommendation says so once; a user who disagrees with the third names the
third.

## 5. Facts and decisions are not asked the same way

| Kind                                     | Who settles it | How                                         |
| ---------------------------------------- | -------------- | ------------------------------------------- |
| A fact the environment holds             | The agent      | Read it, or dispatch a sub-agent to read it |
| A decision about what is wanted or worth | The user       | Ask it, and wait                            |

Asking the user for a fact the repository already states wastes the one thing
the round is spending, which is the user's attention.

Looking a fact up does not stop the round. Only the questions downstream of a
running exploration wait for it; the rest of the frontier is asked meanwhile.

## 6. The end condition

A session **completes** on two things, both required:

1. The frontier is empty.
2. The user confirms the understanding is shared.

There is no question cap. A design is not finished being interrogated because a
number was reached.

That is why a grilling question spends no clarification budget. A budget bounds
the questions asked to resolve ambiguity in a request; these are the decisions
the design itself leaves open, and a cap on them ends the session with decisions
still open — which the agent would then proceed on as labelled assumptions,
assuming exactly what the session existed to settle.

An agent that answers its own decisions has broken this rule. It has not read it
liberally, and a short session is not evidence that the design was simple.

### The user ends it whenever they say so

Completion is how a session ends on its own. It is not the only way one ends.

A user's **stop** ends the session immediately, frontier empty or not: ask
nothing further and do no further work. The open decisions are reported as open,
not assumed. Nothing above outranks that, and an agent that kept asking because
condition 1 was unmet has read this rule as a licence to ignore the user.

A user who closes the questions instead — **proceed**, **done**, or an answer to
that effect — ends the asking. The agent continues, and every decision still
open is recorded as an assumption and labelled as one.

## 7. When talking cannot settle it

A question about how something should look, or how it should feel to use, needs
something to react to. No number of rounds produces that.

Stop grilling and build something to react to. The reaction is the answer, and
the questions it raises are a new frontier.

What that artifact is belongs to the stage the session is running in, and this
rule does not choose it or move the work to another stage. A sketch inside the
current stage is the usual answer. Reaching for a later stage's artifact is that
stage's own decision, under its own preconditions.

## Related

- Writing standard for the questions and the record: `documentation-clarity.md`
- How much code answers a decision, once it is made:
  `minimal-implementation.md`
