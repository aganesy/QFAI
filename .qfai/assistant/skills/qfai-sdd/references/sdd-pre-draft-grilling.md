# Pre-draft Grilling

A loop that runs before a phase writes anything. Three parts: the agents that
will author the phase's artifacts, a griller that interviews them, and the
orchestrator that holds the result.

The method is `.agents/rules/grilling.md`, run through the `qfai-grilling`
skill. What ends a session with no user in it is
`.qfai/assistant/constitution/review-convergence.md#agent-to-agent-grilling-must`.
Neither is repeated here. This file says where the loop runs, who plays what,
what the orchestrator does with what comes back, and what the phase records.

## It is not the Reviewer Gate

|         | Pre-draft grilling                  | Reviewer Gate               |
| ------- | ----------------------------------- | --------------------------- |
| Runs    | Before the phase writes             | After the phase has written |
| Answers | Has this been decided               | Is this right               |
| Subject | The decisions the write will encode | The artifact                |

A contradiction, an unconsidered case and a choice that does not fit the
existing code all enter before the write. By the time a reviewer reads the
artifact they are premises, and a reviewer reading a coherent artifact built on
a premise nobody chose returns `PASS`.

Both run. The gate is untouched by this loop.

## Where it runs

Every phase that produces a design decision:

| Phase                               | The decisions                                             |
| ----------------------------------- | --------------------------------------------------------- |
| Phase 0: Contracts-first            | What the contracts are, and what they commit to           |
| Phase 1: Outline                    | What the policy layer says                                |
| Phase 2: Slice                      | What each spec specifies                                  |
| Phase 2c: Obligation reconciliation | How an obligation the contract cannot express is resolved |
| Phase 3: Plan finalize              | What the plan sequences and what it leaves out            |

**The freeze point is this invocation's first write or design mutation in the
phase, not the existence of the artifact.** Most runs are `UPDATE:APPEND` or
`UPDATE:MODIFY` against artifacts that already exist, and a rule keyed on
existence would never fire on them — which is most of the work. Phase 2c is on
the list for the same reason: it makes contract and obligation choices after
Phase 0 has written, so an existence test would exempt exactly the phase that
exists to repair what the earlier ones settled wrongly.

Once the phase has written, a decision argued against what it wrote is a change
to something recorded rather than a choice among options, and the cheaper
conversation is already over.

**Phase 2c gets a checkpoint per expansion, not one per phase.** Its scope is
recomputed after every contract write and the reconciliation repeats until no
write adds work, so a frontier collected before the first write cannot hold the
decisions of a spec the third write brought in. Each re-expansion that brings
decision-bearing work runs its own round before the next mutation.

## Who plays what

| Role         | Played by                                                                    |
| ------------ | ---------------------------------------------------------------------------- |
| Authors      | **Every** drafting role the phase routes, not one of them                    |
| Griller      | A reviewing agent this phase routes, or a second instance of a drafting role |
| Orchestrator | This skill                                                                   |

**One session per phase, over one frontier.** Phase 2 routes
`requirements-analyst`, `test-design-analyst` and, on a UI-bearing target,
`product-experience-architect`; grilling one of them leaves the others free to
settle requirement, test-design or UX decisions after the session and before
their own writes. The orchestrator collects each routed author's open decisions
into a single tree before the first round, which is also what the method asks
for: a frontier is the decisions answerable now across the whole tree, not one
agent's share of them.

A griller may be a role that also drafts or reviews in the same run. A grilling
session and a review are separate invocations with separate contexts, so the
instance that grills does not remember drafting and cannot defer to itself.

What that does not cover is a recommendation an agent made and another adopted
with nobody adjudicating: the same model over the same evidence re-derives the
preference, so correlation survives the reset where memory does not. That case
is
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#a-grillers-recommendations-and-what-they-disqualify`.

## What the orchestrator does

Holding the loop is not authoring. The orchestrator runs it, and does not
answer its questions.

1. Route every drafting agent the phase needs, and a griller, in one work order
   each.
2. Collect their open decisions into one tree, and let the rounds run to the
   budget the convergence rules set.
3. Put to the user **every decision the session settled that authoritative
   evidence did not** — not only the ones still open after the budget. **Every
   distinct position, named with whose it is**, and the griller's
   recommendation. Phase 2 routes three authors, so a decision can carry three
   answers; merging two of them before the user sees it hands them a choice the
   full set was never asked to adjudicate. Through `AskUserQuestion` where it is
   callable for that question and through the same rule's fallback where it is
   not — numbered choices carrying the same parts
   (`.agents/rules/user-questions.md`). A host without the tool is not a reason
   to skip the escalation; it is the reason the fallback exists.
4. Hand the authors the settled set before any of them writes. **Each settled
   decision is persisted by the drafting agent that owns its artifact**, where
   `references/spec-traceability-rules.md` says — `07_Decisions.md` and
   `09_delta.md` are primary artifacts, and the orchestrator may not draft one.
   On a CREATE run the file may not exist yet, so writing it is authoring and
   not integration. What the orchestrator records is the orchestration
   evidence: the phase row and the work orders.

**Step 3 covers agreement, not only deadlock.** A decision the author accepted
from the griller inside two rounds is no longer open, so the convergence rules
do not escalate it — and the delegation baseline says an agent-to-agent decision
with no user adjudication makes the artifact wrong and no reviewer can clear it.
Escalating only the residue would therefore hand the authors a settled set whose
agreed half is the half that fails review.

Authoritative evidence is the exception because it is not a decision at all:
where `.qfai/specs/**`, `.qfai/contracts/**` or a recorded decision answers the
question, that is the answer, and putting it to the user asks them to re-decide
what they already decided.

A decision the user settles is an input to the write, not a note beside it. A
draft that contradicts one is the Drift Protocol's subject, not this loop's.

Under a no-question mode step 3 has nobody to reach. The decision is opened as a
question rather than assumed, the phase's row reads `escalated`, and **the
phase does not write**: the stage's grilling work order stays `PENDING`, which
blocks DONE and leaves the stage resumable.

That is the gate, because `08_Open-questions.md` is not one — a spec pack
carries open questions as a matter of course, so nothing there stops a run.
Writing the phase anyway would encode a design decision nobody took, which is
the outcome the whole loop exists to prevent, reached by the one path where
nobody can be asked.

## What the phase records

Two records, both in the stage evidence, and the quality gate reads both.

**A run-or-skip line per phase**, under `## Pre-draft Grilling`, each carrying
when its session ended and when the phase first wrote — the first recorded
before that write. A row holding only the outcome reads the same whether the
session ran before the phase, after it, or not at all, because it is written at
the end either way:

```text
| Phase | Session   | Frontier                  | Evidence             |
| ----- | --------- | ------------------------- | -------------------- |
| 0     | run       | 4 settled, 0 escalated    | #work-orders-summary |
| 1     | skipped   | empty: answered by <ref>  | -                    |
| 2     | escalated | 3 settled, 1 escalated    | #work-orders-summary |
```

`run` means the phase settled its frontier and escalated nothing. One
escalation makes the row `escalated`, whatever else the phase settled — the
cell says what the phase is waiting on, and a `run` row with an escalation in
its count reads as finished while a user-owned decision is open.

**The settled count is the number of decision rows for that phase.** Each
carries its phase, and a count without the rows behind it is a number nobody
can check — which is also the state a reviewer finds when it goes looking for
what it recommended.

`skipped` names the authoritative artifact that answered the phase's decisions.
A phase whose subject is settled has nothing to grill, and that is a legitimate
outcome — but an omitted session and a legitimate skip are the same absence, so
the skip is written down and the absence of a row is the finding.

**A work-order row per settled decision**, under `## Work Orders Summary`, with
`Task title` = `grilling(<adjudication>): <the decision>` and the shared
schema's columns. `Agent instance` is the agent that made the recommendation,
taken or not. The adjudication says who settled it:

| Adjudication | Meaning for a later reviewer                                    |
| ------------ | --------------------------------------------------------------- |
| `user`       | The decision is the user's. The griller may review the artifact |
| `agents`     | Nobody adjudicated. The reviewer returns `REVISE` and names it  |

The adjudication is required because the reviewer reads its
`Recommended and unadjudicated` answer off this row and holds no memory of the
session. Without it the row says a session happened and not what it settled, so
the two outcomes — which point opposite ways — are one row to the reviewer.
