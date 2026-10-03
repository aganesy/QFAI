---
name: discussion-interview
owner: qfai-discussion
purpose: "Interview the user as a grilling session and record how and when it ended."
requires: [common-grilling-record]
roles:
  [
    discovery-analyst,
    requirements-analyst,
    solution-architect,
    product-experience-architect,
    requirements-reviewer,
  ]
routing-profile: requirements-heavy
---

# discussion-interview

The core interview for concept, scope, stakeholders and constraints. It is a
user session: the interview is this stage's work, so every decision is put to
the user. An interview with no method is the agent deciding and reporting.

## Reads

- `.qfai/assistant/skill/qfai-grilling/SKILL.md` and `.agents/rules/grilling.md`.
- `.qfai/assistant/skill/qfai-discussion/references/discussion-coverage-checklist.md`.
- `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md`, where
  any classified surface is `web`, `mobile`, `desktop` or `mixed`.
- The research summary `discussion-research` reported.

## Writes

- The `## Grilling Session` row, in the stage report.

The records the session's ending produces — register rows and labelled
assumptions — are written by `discussion-oq` and `discussion-pack` once the row
is in place.

## Procedure

1. Read `.qfai/assistant/skill/qfai-grilling/SKILL.md`, then run the interview
   as a grilling session through that skill. **Read the file, do not work from
   the name.** A host that loads a skill body lazily gives an agent the
   reference and not the procedure, and an agent with the reference alone
   improvises an interview that looks like the method and answers to nothing.
   If the file is absent, stop and report that `npx qfai init` installs it. The
   method is `.agents/rules/grilling.md` and this step does not restate it.
2. Cover every topic in
   `.qfai/assistant/skill/qfai-discussion/references/discussion-coverage-checklist.md`.
3. Where any classified surface is `web`, `mobile`, `desktop` or `mixed`, cover
   the design-direction decisions in
   `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md` in
   the same session. Not every UI-bearing target: a cli-only pack is UI-bearing
   and the brand questions do not apply to it, because nothing downstream reads
   a `visual.*` token tree for one. The design direction belongs in this session
   because `discussion-pack` records it after the pack is authored, and a
   user-owned visual choice asked there is asked after the thing it governs is
   written.
4. The research findings are inputs to the session's tree, not a later fill-in:
   a decision settled before the research that bears on it is settled against
   evidence nobody had, and the method reads a fact rather than asking about it.
5. Write the `## Grilling Session` row as the session ends, before any pack
   file (see [The record](#the-record)).

Inside a workflow run, what the work order's `settled` field records is not
asked again
(`.qfai/assistant/rule/shared-skill-operating-baseline.md#a-work-orders-steps`),
and the interview covers only the product scope it leaves unresolved.

## Writes that are not authoring

**Authoring the pack** — the nine mandatory files and the UI sidecars, as the
artifacts a reader takes the design from — does not start until the session has
ended. Three writes are not that authoring, and happen when the process reaches
them:

| Write                                                                       | When                | Why it is not authoring                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The research summary in this run's stage report                             | Before the session  | The session reads it. Held back, the decisions are settled against evidence nobody had. It is not in the pack: no pack directory exists yet, and one opened here is what a cancelled run would leave behind |
| A register entry or a labelled assumption the session's own ending produces | As the session ends | It records what the session did. Withheld, a no-question run cannot write the open questions that block its completion                                                                                      |
| A throwaway artifact built to make a question answerable                    | Mid-session         | The method calls for it where talking cannot settle the question. It is not the pack, and it is not kept                                                                                                    |

Where each outcome is recorded is
`.qfai/assistant/skill/qfai-discussion/references/oq-and-deferred-rules.md#where-a-grilling-sessions-outcome-goes`.

## How the session ends

A user session reaches four of the five endings the rule names — `adopted` ends
only a delegated session — and three of them let authoring start:

| Ended         | What the user did                                                                                                | Authoring                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `confirmed`   | Confirmed on the session's own condition: no node open — the frontier empty **and** no fact lookup still running | Starts                                                                                                                                                                     |
| `user-closed` | Said `proceed`, `done`, or words to that effect                                                                  | Starts. Lookups already running are finished and each decision still open becomes a labelled assumption, except one a document requires the user to make and record        |
| `no-question` | Nothing — `--auto` reached nobody                                                                                | Starts. Every node still open is registered — a decision, and a fact only the user holds, which nothing else can supply, and the open count is then what blocks completion |
| `stopped`     | Said `stop`                                                                                                      | **Does not start.** Report every open decision as open and end the run                                                                                                     |

**No ending authorizes authoring while a `hard-required` input this invocation
consumes is missing.** Those are excluded from both assumption paths: an
interactive closure still asks for them, and a no-question run stops and names
them. Registering an open question does not make an input defaultable — the
value is what the run needs, and a question about it is not one.

**An interactive closure does not assume a decision some document requires the
user to make and record.** `proceed` and `done` end the asking while the user is
still there, so a decision they own is put again rather than assumed. The
`hard-required` bound above does not reach it: that one is about an input the
run consumes, and this is a decision the run is not permitted to take. The
visual direction is the case here —
`.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md` says
only the user may choose a theme. The rule states the same bound from its side:
closing the questions waives the agent's own uncertainty, never an
authorization the user has not given.

**`--auto` is the other case, and its answer is already written.** Nobody is
there to put the question to, so the documented path holds: take the most
conventional candidate, record it `chosen_by: assumption`, open it in
`11_OQ-Register.md`, and author — the open count is what blocks completion.
That is the rule's own shape for a no-question mode, the defaulted value written
down **and** labelled beside the open question. What is forbidden is the
assumption on its own, and a bar on authoring here would produce neither: no
pack, and so nowhere to register the question that was supposed to block it.

`stopped` is the one the vocabulary must keep separate. The rule says a stop
ends the session immediately and no further work follows it, so a closure that
authorizes proceeding and a cancellation cannot share a value — a pack drafted
after `stop` is the run doing exactly what the user told it not to.

## The record

Write the stage report's `## Grilling Session` row in the shape
`.qfai/assistant/step/common-grilling-record/STEP.md#one-session` sets out, and
write `Ended at` before the first pack file. The reviewer reads the session condition
off that row. Without it a skipped session and a completed one present the same
pack — nine files, every topic covered, every open question registered — so
the reviewer would have to block every run or accept a claim it cannot check.

A `stopped` session writes no row: the ending is reported, and no later step
runs.

## Gate

The reviewer confirms:

- the stage report's `## Grilling Session` row shows the session ended before
  authoring began, with `Ended` one of `confirmed`, `user-closed` or
  `no-question`;
- every decision the session settled is recorded where
  `.qfai/assistant/skill/qfai-discussion/references/oq-and-deferred-rules.md`
  says;
- every required topic in the coverage checklist was put to the session.
