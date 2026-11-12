---
name: discussion-interview
owner: qfai-discussion
purpose: "Interview the user as a grilling session, and write each question to the run's deliberation record and each question left open to open-questions.md."
requires: [common-grilling-record]
---

# discussion-interview

The core interview for concept, scope, stakeholders and constraints. It is a
user session by default: every decision is put to the user. The only delegated
exception is `.agents/rules/grilling.md#explicit-delegation-for-a-discussion`,
with actual user authority recorded before agent-to-agent rounds.
An interview with no method is the agent deciding and reporting.

## Reads

- `.qfai/assistant/skill/qfai-grilling/SKILL.md` and `.agents/rules/grilling.md`.
- `.qfai/assistant/rule/references/deliberation-record.md`.
- `.qfai/assistant/skill/qfai-discussion/references/discussion-coverage-checklist.md`.
- `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md`, where
  any surface of the target is `web`, `mobile`, `desktop` or `mixed`.
- The research summary `discussion-research` reported.

## Writes

- The run's deliberation record, under this stage's subheading, as
  `.qfai/assistant/step/common-grilling-record/STEP.md` says.
- One `<paths.specsDir>/open-questions.md` row for each question the stage
  left open.

No other story-tree file, no policy file, no contract and no root `DESIGN.md`.

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
3. Where any surface of the target is `web`, `mobile`, `desktop` or `mixed`,
   cover the design-direction decisions in
   `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md` in
   the same session. A `cli` target skips the brand questions, and so does a
   project whose root `DESIGN.md` already sets the direction the request keeps.
4. The research findings are inputs to the session's tree, not a later fill-in:
   a decision settled before the research that bears on it is settled against
   evidence nobody had, and the method reads a fact rather than asking about it.
5. Write each question as an Interview row of the record when its answer
   arrives, not at the end of the session.
6. Write one `open-questions.md` row for each question the session left open,
   in the form the register's header comment states. A term the session settled
   is such a row too, naming the term and its definition, as
   `.agents/rules/grilling.md#terms-against-the-glossary` says.
7. Invoked by name, this step is the run's last step: commit locally only the
   run's deliberation record and the `open-questions.md` rows the run wrote,
   and push nothing. In a route, the route's last step commits them.

Inside a workflow run, what the work order's `settled` field records is not
asked again
(`.qfai/assistant/rule/shared-skill-operating-baseline.md#a-plans-steps`),
and the interview covers only the product scope it leaves unresolved.

## How the session ends

The default user session reaches four of the five endings. An explicitly
delegated discussion may also end `adopted` under the master's conditions:

| Ended         | What the user did                                                                                                                                                                                | What the stage writes                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `confirmed`   | Confirmed on the session's own condition: no node open — the frontier empty **and** no fact lookup still running — and a clean confirmation-sheet reply (`grilling.md` § The confirmation sheet) | The rows of every question asked                                                                                                    |
| `user-closed` | Said `proceed`, `done`, or words to that effect                                                                                                                                                  | Each decision still open becomes an Agent decisions row labelled an assumption, except one a document requires the user to make     |
| `adopted`     | Explicitly delegated judgment for this scope                                                                                                                                                     | Each decision of the delegated rounds as an Agent decisions row, once the recorded delegation conditions are met                    |
| `no-question` | Nothing — `--auto` reached nobody                                                                                                                                                                | Each node still open as an `open-questions.md` row, with the most conventional candidate as an Agent decisions row labelled assumed |
| `stopped`     | Said `stop`                                                                                                                                                                                      | **Nothing more.** The rows already written stay uncommitted, every open decision is reported as open, and the run ends              |

**No ending lets the stage go on while a `hard-required` input this invocation
consumes is missing.** An interactive closure still asks for it, and a
no-question run stops and names it. Registering an open question does not make
an input defaultable.

**An interactive closure does not assume a decision some document requires the
user to make and record.** `proceed` and `done` end the asking while the user is
still there, so a decision they own is put again rather than assumed. The
visual direction is the case here:
`.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md` says
only the user may choose a theme by default, and a theme nobody chose stays an
`open-questions.md` row.

`stopped` is the one the vocabulary must keep separate. The rule says a stop
ends the session immediately and no further work follows it.

## Gate

The stage worker confirms:

- every question put to the user is an Interview row of the run's record, with
  a free answer quoted word for word in `Option 4 (other)`;
- every question left open is an `open-questions.md` row;
- every required topic in the coverage checklist was put to the session, or is
  an `open-questions.md` row;
- no tracked file changed except the run's deliberation record and its
  `open-questions.md` rows.
