# Concrete-Abstract Cycle

After Stage 4 and before the per-flow gate, `/qfai-sdd` checks the rules it
wrote against the examples they generalize. A rule can imply a case no example
states, and an example can hold a case no rule explains. The cycle finds both
while the author of the rule is still in the invocation.

## When a cycle runs

A cycle runs when Stage 4 of this invocation wrote or changed the Statement or
the Examples cell of at least one BR.

No cycle runs when:

- the invocation wrote or changed no BR Statement and no Examples cell, even if
  it changed an AC or an EX;
- the stage is an append stage, which appends one example for a diagnosed
  defect. That stage may not change a US, an AC, a BR Statement or an existing
  EX, which is what most findings would change.

## The finder

The finder is a sub-agent, such as a `test-design-analyst`, that wrote none of
the BRs it reads. It reads:

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

## Deciding a finding

The session agent holds the cycle and decides each finding.

1. It decides each finding that is not critical itself.
2. A finding that rests on product intent that no BR, no AC, the request nor
   the discussion states is critical. It goes to the user, and no agent
   decides it.

The request bounds what a cycle may add. A proposed EX must be implied by an
existing BR, an existing AC or the request. The session drops one that is not:
no EX is appended for it, and no row is written.

## Applying an adopted finding

The age of the target decides the route.

| Target                                              | Route                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| An AC, EX or BR this invocation wrote               | Changed directly, with no approval. An AC it wrote is split the same way, with no approval, and each EX re-cites the criterion it exercises |
| An item that existed when the invocation started    | Changed directly only under an in-force `Change request:` row (WIP, or DONE on this branch) whose approved change covers this change        |
| The same item, with no row that covers the change   | The change is put to the user, and the item stays unchanged until the user approves it                                                      |
| Creating, splitting, merging or retiring a BF or US | Put to the user, even when this invocation wrote the item                                                                                   |

A row naming the file does not cover a change it did not describe. The drift
protocol approves a proposed change and its affected set as written
(`.qfai/assistant/rule/drift-protocol.md#when-drift-is-detected`). An approved
change is written with one `Change request:` row naming the files it changes,
as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#a-change-to-the-story-tree`
sets out.

Under `--contract`, a finding that only a story change answers asks the user for
a wider change request naming the story file. The story file stays byte for byte
unchanged, and the contract is repaired only within the scope already approved.

After the cycle's changes are applied, rewrite each BR they affect from its
updated EXs.

## Two cycles at most

- A cycle that adopts nothing ends the loop.
- A second cycle runs only after a first cycle that adopted a finding.
- No third cycle runs, even when the second adopted one.

A finding still undecided when the session ends becomes one `open-questions.md`
row at TODO whose Content opens `Unadjudicated:`, followed by the finding and
its target IDs. The per-flow gate reports that row as `QFAI-SPACK-102` until it
is decided.

Under `--auto` nothing is asked. A finding that would go to the user becomes
that row in the cycle that raised it.

The row changes `open-questions.md`, which the drift gate protects. The change
request the user approves when the finding is decided names
`open-questions.md`, and that row is what authorizes the change. Until then the
per-flow gate holds the flow, so no later stage builds on it.

No other record is written. A finding the session decided, and one it dropped,
append no row.

## A decided finding is not raised again

Within a session, the finder does not raise a finding again when either holds:

- It has the kind and target IDs of a finding the session already decided, and
  its case is equal to that case, includes it, or is included in it.
- The proposed change of a change request the user declined already answers
  it. A declined change request is the user deciding that finding, and its
  REJECTED row in `decisions.md` bars the finding it answers.

Matching never goes by wording. A declined change for `BR-0003-0001` and
`EX-0002-0003-02` whose case is "an order of 20 000 in euros" also bars "an order
of 20 000 in any currency other than the default", however either is worded. It
does not bar a finding on the same IDs for an order of exactly 10 000.

A decision appended to reopen a REJECTED row lifts it.
