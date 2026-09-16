# Review Convergence

How a review round ends, and what may follow it. Referenced from
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#round-budget-and-convergence-must`,
which owns the delegation rules these sit beside.

### Round budget (MUST)

- **Two rounds per reviewer per artifact.** Round 1 is the initial review;
  round 2 reviews the fixes. **The budget is spent the moment round 2 returns
  `REVISE`**: the orchestrator MUST NOT start a third review, and MUST stop and
  escalate to the user with the open findings, the fixes already applied, and a
  recommendation. The decision point is round 2's verdict, never a prediction
  about a review that must not run.
- Escalation is not failure. The artifact stays at its current status and the
  user decides: accept with the finding recorded as an Open Question, apply a
  named fix, or drop the item from scope.
- **Completion after escalation.** The user's decision is the exception to
  "no DONE until all blocking reviewers `PASS`", so the escalation has an exit:
  - _Accept as Open Question_ or _drop from scope_ — the artifact may reach
    DONE with the finding recorded; the reviewer's outstanding `REVISE` is
    superseded by the recorded user decision. Cite the decision where the
    stage records decisions (`*_delta.md` / `07_Decisions.md` / a Change
    Request).
  - _Apply a named fix_ — one **verification review** of exactly that fix is
    permitted and does not consume budget (it is round 2b, not round 3). Its
    remit is the named fix only. It may not raise findings unrelated to that
    fix, but a defect the fix **introduced or exposed** is in remit and MUST be
    reported rather than passed over: verifying only the named lines and
    returning `PASS` while a regression sits next to them is a false `PASS`.
    Such a finding escalates immediately (see the severity floor below) and
    still does not start a round 3. The review returns `PASS` or escalates
    again.
  - **One 2b per artifact, total.** The verification review is free of budget,
    not unbounded: a second escalation on the same artifact MUST NOT be
    answered with another _apply a named fix_ + 2b cycle. Without this cap the
    two rules compose into a loop — 2b costs nothing, and escalating again is
    always allowed — so the gate has no guaranteed end. At the second
    escalation the user is offered only _accept as Open Question_ or _drop the
    item from scope_. The severity floor below then withholds _accept as Open
    Question_ for its classes, so for those findings the intersection of the
    two rules leaves _drop the item from scope_ alone — which is the state
    **Corrective review** below exists to give an exit.
  - **Severity floor on the exit.** _Accept as Open Question_ is NOT available
    for a finding that names a concrete security defect, data loss or
    corruption, or a correctness defect that would break a released contract.
    Present the user only _apply a named fix_ or _drop the item from scope_ for
    those, and say why the third option is withheld. Without this the general
    exit is a route around "deferring such a finding to an Open Question so a
    `PASS` can be returned is prohibited" — one that needs no lateness and no
    reviewer consent, only a user click.
  - **Corrective review (the one exit the floor leaves open).** The two rules
    above compose into a dead end, and it is reachable: a Round 2b that
    correctly reports a defect the named fix INTRODUCED or EXPOSED escalates a
    second time, at which point the 2b cap withholds _apply a named fix_ and
    the severity floor withholds _accept as Open Question_ — so for a security,
    data-loss or released-contract-correctness finding the only remaining
    option is _drop the item from scope_. Fixing the defect and keeping the
    requirement has no path: the fix cannot be verified, and the artifact
    stays at `REVISE` forever. Round 2b doing its job is what puts the stage
    there.

    When that state is reached AND the user chooses to fix rather than drop,
    the stage MAY open **one corrective review artifact**. It is not a third
    round and not a budget reset; it is a separate artifact with a remit
    narrower than any round, and it is bounded so that the two rules above
    cannot compose through it either.

    Required before the review runs — all of it, in the stage's evidence:
    1. the originating artifact, and the Round 2b finding verbatim;
    2. the user's decision, recorded where the stage records decisions
       (`*_delta.md` / `07_Decisions.md` / a Change Request);
    3. what was changed to fix it;
    4. the before and after revision of every artifact the fix touched, as
       digests a reader can re-derive rather than as a round name.

    Constraints on the review itself:
    - **Remit is the finding and the named fix, nothing else.** Narrower than a
      round: a corrective reviewer may not re-open the artifact generally. An
      unrelated finding goes to the owning stage's delta or a Change Request
      under the convergence rules, and does NOT extend this review.
    - **One independent review, once.** Recorded as `Round: corrective` — not
      `2c`, and not a numbered round, because a number invites a successor.
    - **`PASS` supersedes the Round 2b finding** on the originating artifact
      and returns the stage to the review gates it had not yet reached. It does
      not retro-`PASS` anything else.
    - **`REVISE` is terminal.** The stage stops with the finding recorded. No
      second corrective artifact, no further review, and no route back to
      _apply a named fix_. This is the guaranteed end the 2b cap exists to
      provide, moved one step later rather than removed.
    - **The floor and the Open Question prohibition are unchanged.** A
      corrective review cannot return `PASS` over a live security, data-loss or
      released-contract defect, and the finding cannot be deferred to an Open
      Question at any point in this path.
    - **A discussion pack is not an input to this.** It is non-normative
      reference material, so a corrective review neither repairs one nor treats
      one as the upstream to fix.

- The round number MUST be recorded on each reviewer response
  (`Round:` in the shared response template).

### Convergence (MUST)

- A finding first raised in round N > 1 MUST state why it was not raisable in
  round N-1 — the fix introduced it, or the fix exposed it. A finding that was
  raisable in round 1 and was not raised is **out of budget**: record it as an
  Open Question or a `*_delta.md` Decision Record for the owning stage, do not
  block on it.
- A reviewer MUST NOT open a new blocking _class_ of finding after the artifact
  under review has been declared stable. New classes go to the owning stage.
- **Severity overrides lateness.** The out-of-budget rule is about review
  discipline, not about shipping known harm. A late finding that names a
  concrete security defect, data loss or corruption, or a correctness defect
  that would break a released contract is **not** deferrable: the orchestrator
  stops and escalates to the user immediately, exactly as it does when the
  round budget is spent. It is still not a third round — no further review is
  started, the finding goes straight to the user with its evidence. Deferring
  such a finding to an Open Question so a `PASS` can be returned is prohibited.
  That prohibition does not depend on lateness or on who proposes the deferral:
  the escalation exit in the round budget withholds _Accept as Open Question_
  for this same class, so a user choice cannot supersede it either.

### Answered demands (MUST)

A demand already answered MUST NOT be re-raised under another wording. Close a
repeat by citing its recorded answer. This bounds what a reviewer may require,
not what a reviewer may report.

A demand is answered only after the authoritative reviewer accepts the fix or a
reasoned decline, or the user adjudicates it. Record that disposition and its
evidence in the existing Response and Evidence cells. A producer's reply alone
does not close a demand. An unresolved blocking demand remains REVISE when
repeated; cite its prior finding and unresolved disposition instead of requiring
new work under another wording.

Carry prior answers forward, alongside newly answered demands, into the next
cycle's `review_request.md` before dispatching reviewers. Each entry names the
original finding source, demand, response and evidence supporting the response.
When there are no answered demands, write `None`.

A report of a new defect or evidence that an answer no longer applies must
state what changed. The existing severity floor and escalation rules still apply.

### Discussion review precision

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
(`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`):
`Severity: advisory`, and `Traces to: none` where the item names no obligation
the pack carries — which is the usual case here, since the subject is how a
later stage implements something already agreed. An advisory tracing to `none`
takes the Change Request path only where it proposes a new obligation; advice
about implementing an existing one proposes nothing and needs no record beyond
the disposition the next stage gives it.

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

### Agent-to-agent grilling (MUST)

A grilling session between agents has no user answering its questions, so the
end condition the session rule states — an empty frontier and the user's
confirmation — cannot be reached from inside it. Two agents can also agree on a
wrong premise with nobody watching. These rules bound the **rounds** such a
session may take before every decision the user has not settled goes to the user.

**They do not end the session.** It ends where every session ends, in one of the
four the session rule names: with a user present, the user ends it; under a
no-question mode, where the escalation has nobody to reach, the register write
below ends it `no-question`. An agent that
treated the budget as an ending closed a session nobody was asked to close.

**Two rounds**, the same budget a reviewer has. **Every decision the user has not settled escalates after the second round** — the ones still open and the ones the agents agreed on, since an agent-adopted recommendation is a decision nobody took — whether or not the agents agreed on others in that round:
partial progress is the ordinary outcome, and a condition reading "the round
settled nothing" would be false almost always, leaving the rest of the frontier
to a third round nobody authorised.

Each escalated decision goes to the user with both positions and a
recommendation. Escalating is not failure: the work stays where it is and the
user accepts, decides, or drops the item, exactly as at the reviewer gate.

**Three subjects escalate at once**, without spending a round. The test in each
is authoritative evidence: `.qfai/specs/**`, `.qfai/contracts/**`, and recorded
decisions. A discussion pack is not among them — it is non-normative discovery
material (`.qfai/assistant/constitution/drift-protocol.md`), so a decision
resting on one alone is a proposal awaiting promotion rather than a settled
answer.

| Subject                                                            | Escalates when                                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Product or business intent                                         | No authoritative artifact answers it. Where one does, that is the answer and there is nothing left to settle          |
| A decision contradicting a spec, a contract or a recorded decision | Always. Changing settled input is a Change Request, not a design round                                                |
| A decision resting on nothing authoritative                        | Always, discussion-pack support included. Two agents reasoning past the evidence converge on the more fluent argument |

Each names a decision agents cannot settle from what the repository
authoritatively holds. Rounds spent on one produce agreement, which is not the
same as an answer and is harder to tell apart afterwards.

Under a no-question mode the escalation has nobody to reach. The decision is
opened as a question in the register the stage reads, so the stage cannot
complete over it (`.qfai/assistant/constitution/constitution.md` Article X,
rule 6).
