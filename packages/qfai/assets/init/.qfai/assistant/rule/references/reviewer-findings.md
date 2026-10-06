# Reviewer Findings

Read when a reviewer finding is written or judged.

## Finding provenance

- Every finding must declare a severity (`blocking` or `advisory`) and a `Traces to:` value.
- `Traces to:` names what the finding enforces. Legal values:
  - an upstream obligation — a `BF-*`, `AC-*`, `EX-*`, `BR-*` or contract ID, or a named shared rule **that governs the product's behaviour**;
  - `defect:correctness`, `defect:security`, or `defect:code-quality` — a defect demonstrable from the changed artifacts themselves, cited with the evidence that demonstrates it (see `.qfai/assistant/rule/drift-protocol.md#defect-or-new-scope-decide-this-first`). A reviewer who can show the deliverable is wrong on its own terms does not need an `AC-*` to say so;
  - `record:<CODE>` — a defect in the run's own record rather than in the product: an evidence section, a round block, an anchor, or provenance prose. `<CODE>` names the record rule;
  - `none` — reviewer-originated scope, i.e. a new product obligation upstream never asked for.
- `record:*` and `none` MUST be recorded as `advisory`; neither can be `blocking` or gate `DONE`. A `record:*` finding never re-runs the row: the orchestrator files it in the record-defect queue the reviewing stage's own completion contract names, and that contract is what drains it (`.qfai/assistant/rule/drift-protocol.md#the-record-defect-queue`). **The class needs a drain:
  only a stage whose completion conditions require that queue drained may use it — today `/qfai-implement` alone, so `/qfai-sdd`, `/qfai-configure`, `/qfai-verify`, `/qfai-discussion` and `/web-research` reviewers must not, and there the finding keeps the class it would otherwise have had.** An entry closes only on a repaired record;
  `record:unchecked` is never a substitute for the repair — a record rule worth a round is worth a validator code.
- **Integrity is not record class.** Evidence copied from another round or a sibling row, an anchor resolving to a run other than the one it names, and a reviewer that authored what it reviews all claim work that was not done or independence that is missing. A `PASS` built on them is refused,
  so they stay `blocking` as `defect:code-quality` and are never filed as `record:*` — which covers an honestly produced record that is merely wrong.
- A `none` advisory takes the Change Request / Open Question path (`.qfai/assistant/rule/drift-protocol.md#reviewer-originated-obligations`); a `record:*` advisory takes the queue above. Neither goes to the implementer.
- Only `blocking` findings force `REVISE`, and only a finding citing a behaviour-governing obligation or a defect class may be one. **The trace class bounds which findings may block; the severity is declared, and it settles whether one does.** Read as "an obligation trace is blocking", the same item was a discussion-blocking defect to one reviewer and carried advice to the next.
- An obligation-traced finding is recorded `advisory` where a named section places the work outside the reviewed stage. The discussion review's implementation precision is that section
  (`.qfai/assistant/rule/review-convergence.md#discussion-review-precision`): the obligation is agreed, and what the advice is about is how a later stage implements it, so the finding is carried to that stage rather than demanded here. Nothing else lowers a behaviour-governing finding to `advisory`.

## What a reviewer may demand more of (MUST)

A finding that asks for more work — another item, more detail, a wider set — is admissible only on
the concrete artifacts.

| Admissible on                                                           | Inadmissible on                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| business flows, user stories, acceptance criteria, examples, test cases | business rules, non-functional requirements, policies and decisions, architecture |

Two demands stay admissible on any artifact:

- that an abstract item already recorded carry its mandatory pair, such as a quality floor naming
  its verification method;
- that a safety-floor item be met: security, accessibility, data-loss handling, or validation at a
  trust boundary (`.agents/rules/minimal-implementation.md` § 2).

This bounds what a reviewer may require, never what a reviewer may report. A demand the table does
not admit, such as one for another business rule, is recorded as `advisory` and cannot force
`REVISE`.
