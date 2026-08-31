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
the spec's record-defect queue rather than by re-running the row. And
`record:unchecked` is a bug report against `validateTddList`, not against the
item: a record rule worth a round is worth a validator code.

**Not every record complaint is `record:*`.** Evidence copied from a previous
round or a sibling row, an evidence anchor resolving to a run other than the one
it names, and a false `Authored/edited under review` attestation claim work that
was not done or independence the reviewer did not have. `agents/qa-gatekeeper.md`
rejects the first two outright and a response whose attestation is anything but
`none` cannot return `PASS` at all — so these stay **blocking** as
`defect:code-quality`. `record:*` is for a record that is honestly produced and
merely wrong: a tier missing from an Evidence cell, a `Satisfied-by` naming the
wrong sibling row, an unlabelled round block.

Route a `none` advisory per `drift-protocol.md#reviewer-originated-obligations`:
record it in the reviewer response under `Advisory / Change Request proposals`.

Route a `record:*` advisory to the queue instead
(`drift-protocol.md#the-record-defect-queue`): the reviewer records it in its
response, and the orchestrator appends it to `## Record defects` in this stage's
evidence file — `.qfai/evidence/implement-<spec-id>.md`, or
`.qfai/evidence/atdd-<spec-id>.md` when that file is the one the spec has. Each
entry names the `<CODE>`, the row it is against, what the record says against
what the run did, and the round. That drain gates the **spec** boundary only —
a `record:*` finding never holds an individual row out of `done`.

**The class needs a drain, and `/qfai-implement` is the stage that has one.**
The queue is named in `../SKILL.md#spec-completion-conditions`; no other
stage's completion conditions mention it, so a `/qfai-sdd`, `/qfai-atdd`,
`/qfai-configure`, `/qfai-verify`, `/qfai-discussion` or `/web-research`
reviewer MUST NOT classify a finding `record:*` — there it keeps the class it
would otherwise have had and stays blocking. Nor is the queue's home a
`<stage>-<spec-id>.md` pattern: a stage names its own evidence file, and
`/qfai-configure`'s is `.qfai/evidence/configure-<run-id>.md`, one per run.

Before spec-level completion is declared, every open entry is **repaired in
place**. A `validateTddList` bug report is what a `record:unchecked` entry owes
_in addition_, for the check nobody wrote; it never closes the entry on its own,
because a report against the validator leaves the wrong record wrong and the
round that found it already spent. Where the round's artifacts no longer say
what the run did, the record cannot be repaired honestly — that is the integrity
case above, so the finding becomes `defect:code-quality` and blocks. An entry
closes on a corrected record or on a blocking finding, never on neither.

**Repairing a hashed entry needs a re-attestation, not a re-run.** A
`Satisfied-by`, a round block and every other phase-authored field are inside
the bytes a reviewer's `Audited evidence hash` covers, and completion gate item
10 recomputes it — so an in-place repair makes a correct PASS read as stale.
After repairing, a reviewer of the role that issued the verdict re-reads the
entry and emits a record re-attestation — same `Reviewed revision`, same
`Result`, recomputed `Audited evidence hash`, and the entry's `<CODE>`.

**It is written as its own `review-<timestamp>/` pack, and the pack it
supersedes is left untouched.** A verdict is stored in a review pack fixed by a
`Review pack seal` that gate item 10 recomputes, so rewriting the verdict's
hash line where it is stored breaks that seal, and rewriting only the evidence
file's copy leaves the sealed reviewer response carrying a hash nothing agrees
with. The superseded verdict keeps what it recorded, correct over the bytes it
read; the evidence entry gains `Record re-attestation`,
`Record re-attestation pack` and `Record re-attestation pack seal` beside it,
and the gate recomputes the superseding hash and both seals. No code runs and
no round is spent — it opens none, so it is not a `Round N:` pack. A repair
that would move the revision is not a record repair; it is a change to the
deliverable.

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
