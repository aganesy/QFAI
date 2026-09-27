---
name: prototyping-loop
owner: qfai-prototyping
purpose: "Generate, review and transcribe one prototype lineage per UI contract and screen until it converges, then put it to the user."
requires: [common-grilling-record]
roles:
  [
    orchestrator,
    product-experience-architect,
    product-surface-reviewer,
    devops-ci-engineer,
    completion-reviewer,
  ]
routing-profile: ui-bearing
---

# prototyping-loop

The sealed generate, review and transcribe loop around
`.qfai/evidence/prototyping/prototyping.json`, cycles C0 to C9, and the user
acceptance session `U` that follows convergence. The loop runs up to 10 cycles
against a frozen `DESIGN.md` and a frozen UI contract set, one lineage per
`UI contract × screen` pair. `H` below is the handoff, `prototyping-handoff`.

## Reads

- `.qfai/evidence/prototyping/grilling.md`, which `prototyping-grill` wrote.
- The UI contracts in scope and root `DESIGN.md` (read-only).
- The references below.

## Writes

- `.qfai/prototype/iter-NN/index.html` (the generator).
- `.qfai/evidence/prototyping/iter-NN/review.json` and
  `iter-NN/<ui-contract-id>/<screen>.review.json` (the reviewer).
- `.qfai/evidence/prototyping/prototyping.json#iterations[]` and `progress.md`
  (the orchestrator).
- The session rows of `.qfai/evidence/prototyping/grilling.md` (step `U`).

## Required References

- `.qfai/assistant/skill/qfai-prototyping/references/iteration-loop.md` — flow,
  exit codes, evidence paths, the sealed loop
- `.qfai/assistant/skill/qfai-prototyping/references/generator-prompt.md` —
  generator system prompt, Tailwind CDN and DESIGN.md token injection rules
- `.qfai/assistant/skill/qfai-prototyping/references/reviewer-prompt.md` —
  reviewer schema, the four UX axes, layout anti-patterns (static regex and
  reviewer-judged entries), `designMdViolations`, pivot rules
- `.qfai/assistant/skill/qfai-prototyping/references/review-payload-schema.md`
  — the closed per-screen payload
- `.qfai/assistant/skill/qfai-prototyping/references/evidence-requirements.md`
  — the `taskFidelity` section of an evidence file
- `.qfai/assistant/skill/qfai-prototyping/references/iterate-flags.md` — every
  `iterate` flag

## Delegation Scope Table

Generation and live review use two distinct sub-agent identities. The reviewer
operates Playwright during the assessment and owns its review payload. Capture
is an optional `iterate --capture` CLI operation for additional evidence; it
does not require a third sub-agent identity. Name its operator only when that
flag is selected. The build owner is separate from this identity rule.

| Work                                          | Allowed Role                         |
| --------------------------------------------- | ------------------------------------ |
| Generation and implementation                 | product-experience-architect         |
| Live Playwright review and evaluation scoring | product-surface-reviewer             |
| Build                                         | devops-ci-engineer, backend-engineer |
| Optional Playwright CLI execution & capture   | devops-ci-engineer                   |

## Procedure

Every cycle requires generation and a separate reviewer who operates Playwright
live. When `--capture` is selected, `iterate` also runs the CLI capture pass for
PNG and HTML evidence. That pass is not a third reviewer or a mandatory third
sub-agent.

### C0 — seed (product-experience-architect)

1. Run `npx qfai prototyping iterate --cycle 0 --target-url <url>`. The CLI
   records `sha256(DESIGN.md)` in `prototyping.json#designMd`.
2. Generator reads contracts + `.qfai/evidence/prototyping/grilling.md` + the
   generator prompt + DESIGN.md tokens, and writes
   `.qfai/prototype/iter-00/index.html`.
3. The reviewer operates Playwright live and writes BOTH
   `iter-00/<ui-contract-id>/<screen>.review.json` (one per UI contract and
   screen pair) and the per-cycle summary `iter-00/review.json` aggregated from
   them, exactly as in C1..9. Cycle 0 can itself converge, and certify rejects
   the run (exit 64) when a declared pair has no payload.
4. REPLACE the seed `iterations[0]` per [Transcription](#transcription), then
   commit `prototyping: iter-00`.

Output: `iter-00`, `prototyping.json#designMd.sha256`.

### C1..9 — review, transcribe, iterate

1. **Reviewer.** Operates Playwright live and writes BOTH
   `iter-NN/<ui-contract-id>/<screen>.review.json` (one per UI contract and
   screen pair; closed schema in the payload schema reference; required by
   certify) and the per-cycle summary `iter-NN/review.json` aggregated from
   them, per the reviewer prompt: the four ordinal UX axes, a critique of at
   most 500 words, `layoutAntiPatternsDetected[]`, `designMdViolations[]` and
   `pivotDirective`.
2. **Orchestrator.** Transcribes them into `prototyping.json#iterations[]` per
   [Transcription](#transcription), updates `progress.md`, and commits
   `prototyping: iter-NN`.
3. **Generator.** `npx qfai prototyping iterate --cycle <n+1>` decides the exit
   (see [Exit codes](#exit-codes)).

After C9 do not call `--cycle 10`: the CLI rejects out-of-range cycles. The
iteration count cap is 10; `--cycle` is 0-indexed; reaching cycle 9 on a
non-converged iteration set exits 65 directly. Recovery is
`prototyping-recover`.

### U — the user acceptance session

**Resume the session against the converged prototype**: the reaction and
everything it raises are a new frontier, not one question — convergence can
make several decisions answerable at once, and `.agents/rules/grilling.md` ends
a session when no node is open rather than on one answer. Its critical
decisions go to the user — the reaction is one, a question of taste the frozen
inputs leave open — through `AskUserQuestion` where it is callable and the
rule's fallback where it is not; the rest take the griller's recommendation, as
before the loop. Read `.qfai/assistant/skill/qfai-grilling/SKILL.md` before
resuming it.

Blocking: `H` does not start until the session ends — no node open and every
critical decision answered.

Record the answer in `.qfai/evidence/prototyping/grilling.md` under
`## Session`, **replacing any row with the same `Scope` and decision rather than
adding beside it, and removing its row from `## Escalated`** — the file is the
current state of the tree, not its history. Two answers to one decision, or a
decision left in both sections, read as contradictory or as settled-and-open to
every later reader, the delegated prompts included: they consume every row
matching their lineage, so a superseded pivot still steers the next cycle.
Run `common-grilling-record` with the same file, as `prototyping-grill` does.

How the session ends decides the route:

- **Closed** — `proceed` or `done` — finishes the running lookups and records
  every other decision still open as a labelled assumption: the user ended the
  asking, not the work, and a reset would be work they did not ask for.
  **This question is not among them.** It is what the loop was run to answer and
  it is this step's own ask-user operation, so it is asked again and its answer
  takes the accepted or rejected route below — a closure cannot assume the one
  choice the whole run exists to obtain.
- **Stopped** — the user said `stop` — ends the run there: report every open
  decision as open and do not reset, because a stop ends the session
  immediately and a reset is further work.
- **Accepted** — the prototype is what they picked — goes to `H`.
- **Anything else** — rejected, or a direction this prototype does not
  implement — takes the cycle-0 reset
  (`.qfai/assistant/skill/qfai-prototyping/references/iteration-loop.md#sealed-loop`),
  carrying their answer as the pivot.

**Ask for the reset before running it**, naming what it destroys in both trees:
in the evidence tree it keeps `iter-00` — renamed to `iter-00.backup-<ISO>` —
and deletes `iter-01` upward, so every later capture, review payload and
critique goes; in the authoring tree `.qfai/prototype/iter-00/index.html` is
overwritten by the next cycle-0 generation with no backup taken. Copy that
directory aside first where the prior prototype still matters. A confirmation
naming one tree understates the loss on the other, and the user reads it as the
whole cost.

**A declined reset ends the run and deletes nothing.** Report the rejected
prototype and the direction they gave, leave both trees as they stand, and stop.
Their answer is still recorded under `## Session` — what is missing is a
prototype, not the decision. There is no other route: every way to build what
they asked for goes through cycle 0, so continuing without the approval means
running the operation they just refused. That is a destructive operation, and
answering a design question is not consent to one.

Not the next C1..9: convergence seals the loop, and `iterate --cycle N` past the
accepted index exits `2` without writing, so a next-cycle route would refuse
the one command that can build what they asked for. Cycle 0 is the documented
escape hatch out of a sealed loop, and the CLI restarts the cycle count with it
— so the ten-cycle budget is counted across resets here, not per reset. When it
is spent, stop and escalate rather than resetting again: an unbounded chain of
ten-cycle loops is the budget removed, by the one route that looks like
following it.

The reason the route exists at all: recording a choice in `grilling.md` does
not change the HTML, and certifying the unchanged iteration would ship the
design they turned down. Cycle 9 bounds this like any other cycle.

Under a no-question mode nobody can answer, so the choice is written to
`## Escalated` and the run stops there rather than certifying a design nobody
picked — convergence is the reviewer's verdict on four axes, not the user's on
the question.

Outcome: closed → ask again; stopped → end; accepted → `H`; anything else →
cycle-0 reset, or end with nothing deleted where the reset is declined.

## Transcription

Applies to C0 step 4 and C1..9 step 2.

The CLI writes a seed iteration; it does not write the reviewed iteration.
After the reviewer writes `iter-NN/review.json`, the orchestrator replaces the
seed or current `prototyping.json#iterations[N]` record. Carry over
`reviewerId`, the four ordinal `scores`, `proseCritique`,
`layoutAntiPatternsDetected[]`, `designMdViolations[]`, and `pivotDirective`
from the reviewer summary. Do not leave any seed value in a reviewed record.

Check the summary's `evidenceRefs[]` array before copying it into the
iteration. Each entry has `{kind, path}`. Match its file path to exactly one
declared screen ID, and reject duplicate screen/kind pairs, missing screens,
unexpected screens, duplicate paths, and paths to absent files. Paths are
POSIX-form relative to `.qfai/evidence/prototyping/`; do not copy the old
`evidenceRefs: {screenshot, html}` object shape or fabricate entries from a
filename template. Without `--capture`, store `evidenceRefs: []`; the reviewer
still operates Playwright live. With `--capture`, require a screenshot and HTML
path for every declared screen, then copy one `kind: screenshot` and one
`kind: html` entry per screen. The per-screen
`UI-NNNN/<screen>.review.json` payloads stay closed and contain no
`evidenceRefs` field. `buildEvidenceRefs()` is a pure helper, not an automatic
CLI writer for this transcription.

Two specifics that are easy to get wrong:

- **Cycle 0 REPLACES `iterations[0]`, it does not append.** `iterate --cycle 0`
  has already written a seed record there, so appending leaves two index-0
  entries and fails QFAI-PROT-004.
- **`reviewerId` must be overwritten.** The seed carries `iterate-seed`. The
  reviewer-deliverable exemption covers only a record that is still the
  untouched seed, so a stale stamp on a reviewed record is reported, not obeyed.

`iter-NN/review.json` is validated directly, against the shape in the reviewer
prompt. A missing or unparseable file, an unknown `lap-*` code, a wrong-enum
`designMdViolations` entry, an out-of-band `proseCritique`, or a
`prototyping.json#iterations[N]` that disagrees with the reviewer's file all
fail validate with QFAI-PROT-002. `iterations[]` is a transcription of
`review.json`, so on a disagreement the reviewer's value is the one to keep. The
cycle-0 seed (`reviewerId: iterate-seed`) is exempt: no reviewer has run yet.

## Exit codes

**Exit codes**: `0` continue (read `pivotDirective`); `64` convergence (all four
per-cycle ordinal UX scores `exceptional`, with `designMdViolations`,
`layoutAntiPatternsDetected` and `blockingFindings` empty in every declared
`(UI contract, screen)` payload); `65` 10 cycles reached; `66` license-verify
failure (`imageSources[]` resolved to a non-allowlisted source, unknown license
tier, non-HTTPS URL, host mismatch against the frozen `sourceHosts`, or missing
or empty `attribution`); `2` input error or drift from the cycle-0 record
(a `DESIGN.md` hash that differs from `prototyping.json#designMd.sha256`, and
`frozenSurfaceUnion` / `frozenLicenseCatalog` drift on cycle ≥ 1).

| Exit | Next                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------- |
| 0    | The next cycle, following `pivotDirective`                                                            |
| 64   | Step `U`                                                                                              |
| 65   | `prototyping-recover` § Cycle 9 budget exhaustion                                                     |
| 66   | `prototyping-recover` § License-verify hard-stop (exit 66)                                            |
| 2    | `prototyping-recover` § Drift from the cycle-0 record, or § Scope reduction for a retired UI contract |

Every cycle after 0 compares the live `DESIGN.md` with the sha256 cycle 0
recorded; a mismatch exits 2 and stops the loop.

## Evaluator Inputs (Mandatory)

- Screenshot evidence path: `.qfai/evidence/prototyping/iter-NN/<screen>.png`
- HTML snapshot path: `.qfai/evidence/prototyping/iter-NN/<screen>.html`
- Review inputs: live Playwright session, prior `review.json` files,
  `progress.md`, root `DESIGN.md` (read-only), `axisDefs`, `previousScore`,
  `designSystemChecklist`, and `.qfai/evidence/prototyping/grilling.md` — what
  the prototype is for, what counts as better, and what is out of bounds. The
  four axes are fixed and say nothing about this prototype's purpose, so a
  reviewer without that file grades every prototype against the same generic
  bar.
- When `--capture` was selected, also read its latest screenshot and HTML
  snapshot. Those artifacts are absent in the default live review.

## Critical Constraints

- One lineage only — no parallel candidates, no best-of-history; the latest
  iter is always accepted.
- `DESIGN.md` is frozen for the run at the hash cycle 0 recorded
  (`.qfai/assistant/step/common-design-md/STEP.md#check-before-building`).
- Token-only colors, fonts, radii and shadows — non-DESIGN.md hex, rgb, rgba,
  hsl, font, radius or shadow values land in `designMdViolations[]` and block
  exit 64.
- No `mode / round / polish / branch / concept-fit` artifacts.

## Autopilot

The two `ask-user` entries of the parent's `## Default Autopilot Policy` that
only this step reaches:

- The choice a finished prototype was built to make answerable, asked again
  against it, in step `U`.
- The cycle-0 reset a rejected choice needs, which deletes `iter-01` upward.

## Gate

The step passes when the loop exited `64` and step `U` ended with the prototype
accepted. Every other ending leaves the step open: the run stops, or
`prototyping-recover` runs.
