# Review Convergence

How a review round ends, and what may follow it. Referenced from
`shared-skill-delegation-baseline.md#round-budget-and-convergence-must`,
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
