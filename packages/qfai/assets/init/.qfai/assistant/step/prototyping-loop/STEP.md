---
name: prototyping-loop
owner: qfai-prototyping
purpose: "Build and review one prototype lineage per UI contract and screen, and put each reviewed prototype to the user until they confirm it."
requires: []
roles: [orchestrator, product-experience-architect, product-surface-reviewer, devops-ci-engineer]
routing-profile: default
---

# prototyping-loop

The build and review loop. Each iteration builds a prototype under root
`DESIGN.md`, has it reviewed, and puts it to the user. The loop ends when the
user confirms the prototype; until then it runs another iteration on the user's
answer. No command, score or check decides that the loop is done.

## Reads

- `.qfai/prototype/grilling.md`, which `prototyping-grill` wrote.
- The UI contracts in scope and root `DESIGN.md` (read-only).
- The references below.

## Writes

- `.qfai/prototype/iter-NN/index.html` (the generator).
- `.qfai/prototype/iter-NN/review.json` and
  `iter-NN/<ui-contract-id>/<screen>.review.json` (the reviewer).
- `.qfai/prototype/progress.md` (the orchestrator).
- The session rows of `.qfai/prototype/grilling.md`.

## Required References

- `.qfai/assistant/skill/qfai-prototyping/references/iteration-loop.md` — the
  iteration, its files, and when the loop ends
- `.qfai/assistant/skill/qfai-prototyping/references/generator-prompt.md` —
  generator system prompt, Tailwind CDN and DESIGN.md token injection rules
- `.qfai/assistant/skill/qfai-prototyping/references/reviewer-prompt.md` —
  reviewer schema, the four UX axes, layout anti-patterns,
  `designMdViolations`, pivot rules
- `.qfai/assistant/skill/qfai-prototyping/references/review-payload-schema.md`
  — the closed per-screen payload

## Delegation Scope Table

Generation and review use two distinct sub-agent identities. The reviewer
operates Playwright during the assessment and returns its review payloads;
it has no write access, so the orchestrator writes them. There is
no fixed capture identity: a screenshot is taken by whoever needs it. The build
owner is separate from this identity rule.

| Work                                          | Allowed Role                         |
| --------------------------------------------- | ------------------------------------ |
| Generation and implementation                 | product-experience-architect         |
| Live Playwright review and evaluation scoring | product-surface-reviewer             |
| Build                                         | devops-ci-engineer, backend-engineer |

Record `targetIterations`, `evaluationAxesSource`, `delegationMap` and
`plannedAt` in `.qfai/prototype/progress.md` before the first review.
`targetIterations` is an estimate of the iterations before the user confirms;
the loop does not stop at it. Report an
assignment that gives generation and review to one identity before either
runs.

## Procedure

Run these for iteration `NN`: the next index after the iterations already
under `.qfai/prototype/`, or `00` when there are none.

1. **Generator** (product-experience-architect). Reads the contracts,
   `.qfai/prototype/grilling.md`, the generator prompt, the `DESIGN.md` tokens
   and, from the second iteration on, the latest reviews and the user's last
   answer. Writes `.qfai/prototype/iter-NN/index.html`.
2. **Build** (devops-ci-engineer). Serves `.qfai/prototype/iter-NN/` at the
   URL preflight checked, and hands that URL to the reviewer.
3. **Reviewer** (product-surface-reviewer). Opens that URL, operates
   Playwright live and returns the payload for each UI contract and screen
   pair, and the per-iteration summary aggregated from them, per the reviewer
   prompt: the four ordinal UX axes, a critique of at most 500 words,
   `blockingFindings`, `layoutAntiPatternsDetected[]`,
   `designMdViolations[]` and `pivotDirective`.
4. **Orchestrator.** Writes each payload to
   `iter-NN/<ui-contract-id>/<screen>.review.json` and the summary to
   `iter-NN/review.json`. Each payload is checked against the closed schema
   before it is written, and one that does not conform is asked for again. It
   runs the reviewer's attempts and writes a failed pair's payload, as the
   payload schema sets out. Then it appends one line for the iteration to
   `progress.md`.
5. **The user.** Put the prototype to the user, as below.

### Putting the prototype to the user

**Resume the session against the reviewed prototype**: the reaction and
everything it raises are a new frontier, not one question — a prototype can
make several decisions answerable at once, and `.agents/rules/grilling.md` ends
a session when no node is open rather than on one answer. Its critical
decisions go to the user — the reaction is one, a question of taste the frozen
inputs leave open — through `AskUserQuestion` where it is callable and the
rule's fallback where it is not; the rest take the griller's recommendation.
Read `.qfai/assistant/skill/qfai-grilling/SKILL.md` before resuming it.

Show the user where the prototype is, the four scores, and every blocking
finding, layout anti-pattern and `DESIGN.md` violation the review lists. The
review informs the answer; it does not replace it.

Record the answer in `.qfai/prototype/grilling.md` under `## Session`,
**replacing any row with the same `Scope` and decision rather than adding beside
it, and removing its row from `## Escalated`** — the file is the current state
of the tree, not its history.

How the session ends decides the route:

- **Confirmed** — the user says the prototype is done — goes to
  `prototyping-handoff`. A blocking finding the latest review still lists does
  not stop it; the final report names it.
- **A change** — the user asks for something this lineage can take — runs the
  next iteration, carrying their answer as the pivot.
- **A different design** — a direction this lineage does not implement — runs
  the next iteration as a pivot, carrying their answer.
- **Closed** — `proceed` or `done` without an answer to this question — records
  every other open decision as a labelled assumption and asks this question
  again. It is what the loop exists to answer, so a closure cannot assume it.
- **Stopped** — the user said `stop` — ends the run there and reports every
  open decision as open.

Under a no-question mode nobody can answer, so the question is written to
`## Escalated` and the run stops there. A reviewer's scores are not the user's
confirmation.

## Evaluator Inputs (Mandatory)

- The live prototype, opened in the reviewer's own Playwright session.
- Root `DESIGN.md` (read-only), `axisDefs`, `previousScore` and
  `designSystemChecklist`.
- The prior `review.json` files and `progress.md`.
- The layout anti-pattern registry the package ships.
- `.qfai/prototype/grilling.md` — what the prototype is for, what counts as
  better, and what is out of bounds. The four axes are fixed and say nothing
  about this prototype's purpose, so a reviewer without that file grades every
  prototype against the same generic bar.
- A screenshot or HTML snapshot, only when one was taken. A finding names any
  mandatory input that is missing.

## Critical Constraints

- One lineage only — no parallel candidates, no best-of-history; the latest
  iteration is always the one put to the user.
- Token-only colors, fonts, radii and shadows — a value `DESIGN.md` does not
  declare lands in `designMdViolations[]`.
- No `mode / round / polish / branch / concept-fit` artifacts.

## Autopilot

The `ask-user` entry of the parent's `## Default Autopilot Policy` that only
this step reaches: whether a reviewed prototype is done.

## Gate

The step passes when the user confirmed the prototype. Every other ending
leaves the step open: the next iteration runs, or the run stops.
