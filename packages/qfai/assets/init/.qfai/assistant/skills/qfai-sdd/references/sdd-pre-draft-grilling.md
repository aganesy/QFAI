# Pre-draft Grilling

A loop that runs before a phase freezes its first draft. Three parts: the agent
that will author the artifact, a griller that interviews it, and the
orchestrator that holds the result.

The method is `.agents/rules/grilling.md`, run through the `qfai-grilling`
skill. What ends a session with no user in it is
`.qfai/assistant/constitution/review-convergence.md#agent-to-agent-grilling-must`.
Neither is repeated here. This file says where the loop runs, who plays what,
and what the orchestrator does with what comes back.

## It is not the Reviewer Gate

|         | Pre-draft grilling                     | Reviewer Gate        |
| ------- | -------------------------------------- | -------------------- |
| Runs    | Before an artifact exists              | After one is drafted |
| Answers | Has this been decided                  | Is this right        |
| Subject | The decisions the artifact will encode | The artifact         |

A contradiction, an unconsidered case and a choice that does not fit the
existing code all enter before the draft. By the time a reviewer reads the
artifact they are premises, and a reviewer reading a coherent artifact built on
a premise nobody chose returns `PASS`.

Both run. The gate is untouched by this loop.

## Where it runs

Every phase that produces a design decision, before that phase's first draft:

| Phase                    | The decisions                                   |
| ------------------------ | ----------------------------------------------- |
| Phase 0: Contracts-first | What the contracts are, and what they commit to |
| Phase 1: Outline         | What the policy layer says                      |
| Phase 2: Slice           | What each spec specifies                        |
| Phase 3: Plan finalize   | What the plan sequences and what it leaves out  |

**The first draft is the freeze point.** Once an artifact exists, a decision
argued against it is a change to something written rather than a choice among
options, and the cheaper conversation is already over.

A phase whose subject is settled by authoritative evidence runs no session:
there is nothing on the frontier. Recording that is one line in the phase's
evidence, not a session.

## Who plays what

| Role         | Played by                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Author       | The drafting agent this phase routes — `solution-architect`, `requirements-analyst`, `test-design-analyst`, `product-experience-architect` |
| Griller      | A reviewing agent this phase routes, or a second instance of a drafting role                                                               |
| Orchestrator | This skill                                                                                                                                 |

A griller may be a role that also drafts or reviews in the same run. A grilling
session and a review are separate invocations with separate contexts, so the
instance that grills does not remember drafting and cannot defer to itself.

What that does not cover is a recommendation an agent made and another adopted
with nobody adjudicating: the same model over the same evidence re-derives the
preference, so correlation survives the reset where memory does not. That case
is `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#a-grillers-recommendations-and-what-they-disqualify`.

## What the orchestrator does

Holding the loop is not authoring. The orchestrator runs it, and does not
answer its questions.

1. Route the author and the griller, in one work order each.
2. Let the rounds run to the budget the convergence rules set.
3. Put every escalated decision to the user, with both positions and a
   recommendation, through `AskUserQuestion` (`.agents/rules/user-questions.md`).
4. Record what was settled where `references/spec-traceability-rules.md` says,
   and hand the author the settled set before it drafts.

A decision the user settles is an input to the draft, not a note beside it. A
draft that contradicts one is the Drift Protocol's subject, not this loop's.

Under a no-question mode step 3 has nobody to reach, and the decision is opened
as a question rather than assumed. `08_Open-questions.md` does not block a spec
stage, so the escalation is still made where the stage's own gate can see it.

## Evidence

Each session is a work order like any other and appears in
`## Work Orders Summary` under the shared schema, with `Task title` as
`grilling: <the decision>`. That row is what a later reviewer reads to answer
whether it recommended the decision it is now being asked to clear — it cannot
attest to that from recollection it does not have.
