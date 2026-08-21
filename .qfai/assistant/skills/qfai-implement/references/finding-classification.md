# Blocking vs advisory findings

Provenance rules: `shared-skill-delegation-baseline.md#finding-provenance-must`.

## Blocking

A **blocking** finding cites either an upstream obligation (`AC-*`, `BR-*`,
`TC-*`, `CON-*`, or a named constitution/catalog rule **that governs the
product's behaviour**) or a defect class (`defect:correctness`,
`defect:security`, `defect:code-quality`) in its `Traces to:` field.

A defect demonstrable from the changed code — an unhandled rejection, a missing
validation on trusted input, a leak, a broken contract the code itself declares
— is blocking without needing an `AC-*`.

Only blocking findings force `REVISE`, and only blocking findings hold the item
out of `done`.

## Advisory

An **advisory** finding is one whose `Traces to:` is `none` — a new product
obligation upstream never asked for. It MUST NOT be implemented as production
code or pinned as a test assertion.

`record:<CODE>` is advisory too. It marks a defect in the run's own record —
a ledger cell, a round block, an evidence anchor, the provenance prose — while
the product itself is not in dispute. It MUST NOT be `blocking`: it settles in
one queue at the spec boundary rather than by re-running the row. And
`record:unchecked` is a bug report against `validateTddList`, not against the
item: a record rule worth a round is worth a validator code.

Route it per `drift-protocol.md#reviewer-originated-obligations`: record it in
the reviewer response under `Advisory / Change Request proposals`.

Do **not** edit `08_Open-questions.md` here. It is upstream SSOT under the Drift
Protocol, and creating spec artifacts is a non-goal of this skill; the owner
phase (`/qfai-sdd`) records and adjudicates it.

## What an advisory does to `done`

- A new advisory that does **not** change an already-approved obligation leaves
  the item free to reach `done`.
- One that **does** change an approved obligation takes the Change Request path,
  and `drift-protocol.md#when-drift-is-detected` applies: STOP, and no `done`
  for items depending on the obligation under dispute until approval and the
  owner rerun.

## The reviewer verdict is still required

`Do not declare DONE until Reviewer returns PASS` is never waived: the Reviewer
verdict is required on every item, including one whose review produced only
advisories.

What **blocking** findings change is the verdict itself — only they force
`REVISE` and hold `done`. An advisory-only review returns `PASS`, and that
`PASS` is still what releases `done`.
