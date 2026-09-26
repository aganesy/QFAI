# Concrete-Abstract Cycle

After Stage 4 and before the per-flow gate, `/qfai-sdd` checks the rules it
wrote against the examples they generalize. A rule can imply a case no example
states, and an example can hold a case no rule explains. The cycle finds both
while the author of the rule is still in the invocation.

## When a cycle runs

A cycle runs when Stage 4 of this invocation wrote or changed the Statement or
the Examples cell of at least one BR.

No cycle runs, and the evidence gets no cycle row, when:

- the invocation wrote or changed no BR Statement and no Examples cell, even if
  it changed an AC or an EX;
- the work order's operation is `defect-example-seeding`. That operation may not
  change a US, an AC, a BR Statement or an existing EX, which is what most
  findings would change.

## The finder

The finder is a `test-design-analyst` that wrote none of the BRs it reads. It
reads:

- each BR whose Statement or Examples cell this invocation wrote or changed;
- the EXs each of those BRs cites;
- the EXs this invocation wrote or changed.

It raises findings of five kinds:

| Kind                                                        | For example                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| A case the rule implies that no example states              | A boundary, the negative side, or a combination of the rule's conditions |
| A redundant example                                         | Two EXs that exercise the same partition of one BR                       |
| An example no rule explains                                 | A cited EX whose case the BR's Statement does not explain                |
| A rule its examples do not support                          | A BR stated wider or narrower than its cited EXs show                    |
| A flow, story or criterion split the rules show to be wrong | One AC whose EXs fall under two BRs that share nothing                   |

A finding names its kind and the IDs it targets. Raising one changes no file. A
cited EX that the Statement does not explain is a finding of the third kind, not
a missing citation.

## Adjudication

Each cycle has one griller. It is neither the finder nor an author of an item
any finding targets. A reviewing role, or a separate instance of a drafting
role, can take it, as in pre-draft grilling (`sdd-pre-draft-grilling.md`).

The griller runs a delegated session under
`.qfai/assistant/rule/review-convergence.md#agent-to-agent-grilling-must`:

1. It puts the findings to the authors of the targeted items, for at most two
   rounds.
2. It then adopts its own recommendation on each finding that is not critical.
   An author's dissent is recorded beside the decision.
3. A finding that rests on product intent that no BR, no AC, the request nor
   the discussion states is critical. It goes to the user, and no agent
   decides it.

The request bounds what a cycle may add. A proposed EX must be implied by an
existing BR, an existing AC or the request. The griller rejects one that is not,
and no EX is appended for it.

## Applying an adopted finding

The age of the target decides the route.

| Target                                              | Route                                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| An AC, EX or BR this invocation wrote               | Changed directly, with no approval. An AC it wrote is split the same way, with no triage row, and each EX re-cites the criterion it exercises |
| An item that existed when the invocation started    | Changed only under an in-force `Change request:` row (WIP or DONE) whose approved change covers this change                                   |
| The same item, with no row that covers the change   | Append a `Change request:` row at TODO and leave the item unchanged until the user approves it                                                |
| Removing an item that existed at the start          | Also a triage row naming UPDATE:REMOVE at TODO                                                                                                |
| Creating, splitting, merging or retiring a BF or US | Keeps its triage approval, even when this invocation wrote the item                                                                           |

A row naming the file does not cover a change it did not describe. The drift
protocol approves a proposed change and its affected set as written
(`.qfai/assistant/rule/drift-protocol.md#when-drift-is-detected`).

Under `--contract`, a finding that only a story change answers asks the user for
a wider change request naming the story file. The story file stays byte for byte
unchanged, and the contract is repaired only within the scope already approved.

After the cycle's changes are applied, rewrite each BR they affect from its
updated EXs.

## Two cycles at most

- A cycle that adopts nothing ends the loop.
- A second cycle runs only after a first cycle that adopted a finding.
- No third cycle runs, even when the second adopted one.

A finding with no decision when the loop ends becomes an `open-questions.md` row
at TODO whose Content opens `Unadjudicated:`, followed by the finding and its
target IDs. The per-flow gate reports that row as `QFAI-SPACK-102` until it is
decided.

Under `--auto` nothing is asked. A finding that would go to the user becomes that
row in the cycle that raised it, and the evidence records it with no decision.

## Rejected findings

Each rejected finding is one `decisions.md` row at REJECTED. Its Content names
the kind, the target IDs, and the case by the input that distinguishes it. The
reason goes in Approach.

The finder does not raise a finding again when either holds:

- It has the kind and target IDs of a finding already decided in this
  invocation, or of a REJECTED row, and its case is equal to that case,
  includes it, or is included in it.
- The proposed change of a `Change request:` row at TODO or REJECTED already
  answers it. A declined change request is the user deciding that finding.

Matching never goes by wording. A row at REJECTED for `BR-0003` and
`EX-0002-0003-02` whose case is "an order of 20 000 in euros" also bars "an order
of 20 000 in any currency other than the default", however either is worded. It
does not bar a finding on the same IDs for an order of exactly 10 000.

A decision appended to reopen a REJECTED row lifts it.

## Inside a workflow run

The cycle runs in the first attempt, on the proposal, before the change
question. A finding for the user becomes a further `decision` question in the
same result, and the attempt holding the answers applies them and writes the
records. That attempt runs no further cycle, because a later cycle would change
the proposal the answer approved. `orchestrated-mode.md` states what each
attempt writes.

## The record

The flow's `.qfai/evidence/sdd-BF-NNNN.md` records every cycle under
`## Concrete-Abstract Cycle` (`../templates/evidence/sdd-flow.md`):

- one row per finding: cycle, finding, kind, target IDs, decision, adjudicator
  and reason;
- one row for each cycle that raised nothing;
- the finder, named in the Work Orders Summary.

A finding's adjudicator is the griller, or `user` for a finding put to the
user. A finding left with no decision records `none` as its decision.

The completion reviewer checks the record, and no validator reads it. The
grounds on which it returns REVISE are in
`sdd-quality-gate.md#concrete-abstract-cycle-record`.
