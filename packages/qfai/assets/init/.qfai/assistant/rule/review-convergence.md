# Review Convergence

How a stage's review ends, and what may follow it. Referenced from
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#review-convergence-must`,
which owns the delegation rules these sit beside.

## One review (MUST)

- The review runs once, after the stage's last step.
- The author fixes or answers every finding: a fix in the finding's owning
  source, or a reasoned answer recorded beside the finding.
- There is no re-review and no `REVISE` loop. Once every finding is fixed or
  answered, the work proceeds.
- A finding the author cannot fix is reported in the stage's final report, with
  the finding and why it stays open.
- A critical decision still goes to the user: one that contradicts a spec, a
  contract or a recorded decision, one whose effect cannot be taken back, or one
  that rests on product intent nothing written states. So does a finding that
  names a concrete security defect, data loss or corruption, or a correctness
  defect that would break a released contract; it is never only reported.

## Answered demands (MUST)

Within a stage there is one review, so no demand comes back in it. The rules
below are for a later, separate stage whose own one review reads an artifact an
earlier stage's review already answered on; they never start a second review in
the same stage.

Record each finding's fix or answer, and its evidence, in the Response and
Evidence cells. When a later stage reviews the same artifact, its
`review_request.md` carries those answers: each entry names the original
finding source, demand, response and evidence. When there are none, write
`None`.

In that later review an answered demand MUST NOT be re-raised under another wording.
Close a repeat by citing its recorded answer. This bounds what a reviewer may
require, not what a reviewer may report.

A report of a new defect or evidence that an answer no longer applies must
state what changed. A critical decision in it still goes to the user.

## Discussion review precision

A discussion review judges what the planning stage decides, not implementation
precision. Exact code-line edits, generated-copy updates and merge mechanics
belong to the stage implementing the change. They may be reported as advice,
not demanded as extra discussion completion work.

Advice is not a verdict. A reviewer whose vocabulary is `PASS` or `REVISE` alone
returns `PASS` and records the advice in its findings, and the review request's
rule says the same: an item marked non-normative under this section is carried
to the implementing stage rather than starting a fix-and-rerun cycle. Reported
as a demand instead, it makes the discussion stage owe work this section has
just placed elsewhere.

**How it is written.** In the shape every finding takes
(`.qfai/assistant/rule/shared-skill-delegation-baseline.md#verdict-vocabulary`):
`Severity: advisory`, and `Traces to:` **the obligation whose implementation the
advice is about** — which the pack carries, since the subject is how a later
stage implements something already agreed. Never `none`: that value means
reviewer-originated scope, takes the Change Request path and reaches no
implementer, and advice about an agreed obligation proposes no new one. Where an
item genuinely names nothing the pack carries it is reviewer-originated scope,
and the baseline's `none` path is the right one for it.

This section is the one place an obligation-traced finding is `advisory`, and
both provenance contracts name it:
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#finding-provenance-must`
and `.qfai/assistant/rule/drift-protocol.md#provenance-and-routing`. There
the trace class bounds which findings may block, and the declared severity settles
whether one does, so an item carried under this section is not also a defect
forcing `REVISE` elsewhere.

**A cycle that reruns one reviewer keeps the others' findings.** The pack is the
cycle's record, not the rerun's: a reviewer that passed is not re-run, its
verdict stands, and its advice stands in the same pack the next stage reads.
A rerun that dropped it would lose the advice of every reviewer who found
nothing blocking.

**Where it goes.** The advice stays in the review pack's findings, under the
discussion pack the next stage inventories at its Stage 0 as non-normative
reference material, like every other part of that pack. That stage gives each
item a disposition in its own artifacts — a plan step, a spec row, an open
question, or a line in its evidence saying it was read and not adopted — and
nothing is back-propagated into the pack. What it may not do is leave an item
unmentioned: a decision nobody wrote down cannot be told from an item nobody
read.

Wrong repository facts, missing decision traceability, scope contradictions and
defects in the pack's own safety obligations remain in remit. Non-normative
status is not permission to pass those.

## Agent-to-agent grilling (MUST)

A grilling session between agents is a **delegated session**
(`.agents/rules/grilling.md`): a griller interviews the authors, and the user is
asked only a critical decision. These rules bound its rounds and say what
settles each decision when they run out.

**Two rounds.** After the second round **every
decision that is not critical takes the griller's recommendation** — the ones
the agents agreed on and the ones still open alike. A third round is never
started: partial agreement is the ordinary outcome, and rounds past two buy
fluency rather than a better answer.

Where the authors disagreed, the recommendation is still taken, and each
position is recorded beside it with whose it is. The stage reports every adopted
decision at its end without waiting for an answer. A user who disagrees
overturns one through a change request or a rerun.

**A critical decision goes to the user at once**, without spending a round.
Rounds between agents produce agreement, and agreement is not what these lack.

| Critical decision                                                                                                                             | Why it goes to the user                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| It contradicts a spec, a contract or a recorded decision                                                                                      | Changing settled input is a Change Request, not a design round              |
| Its effect cannot be taken back: security, lost or corrupted data, a broken released contract, spending, a legal commitment, a public release | A wrong recommendation here is not repaired by the next run                 |
| It rests on product or business intent that the request, the discussion pack, the specs and the contracts all leave unstated                  | Two agents reasoning past the evidence converge on the more fluent argument |

A discussion pack answers product intent for this test. It is non-normative for
the Drift Protocol, but it is where the user already answered these questions in
a user session, and asking them again spends that session twice.

Each critical decision goes to the user with every position and a
recommendation. Escalating is not failure: the work stays where it is and the
user accepts, decides, or drops the item.

**The budget does not end the session while a critical decision is open.** The
session ends `adopted` once the user has answered every critical decision.

Under a no-question mode the escalation has nobody to reach. A critical decision
is opened as a question in the register the stage reads, so the stage cannot
complete over it (`.qfai/assistant/rule/constitution.md` Article X,
rule 6), and that write ends the session `no-question`. Non-critical decisions
are adopted as they are in any delegated session.
