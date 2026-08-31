# A shared test artifact outlives the row that recorded it

P1c closes one row before the next test is written, so the `RED test manifest`
of a `done` row addresses a fixture, snapshot or helper that a **later** row may
still edit. The hash then disagrees with the tree, and a `done` row has no
re-entry edge of its own — so the spec either accepts stale evidence or cannot
be closed.

**Stabilise first where the row can see it coming.** The artifacts an
acceptance test owns — fixtures, snapshots, helpers under the test tree — are
written in P2-P4 with every row's obligation in view, not grown one row at a
time. Where that holds, no later row edits them and the manifests stay true.

**Where a later row does have to edit one, it re-verifies the rows that read
it — and records that on itself.** The editing row already runs its own
selector; run the earlier rows' selectors in the same pass and record them in
**the editing row's** entry, under `Shared-artifact re-verify`: one line per
earlier row naming **its spec and `TDD-ID` together** (`spec-0002/TDD-0001`) and
the evidence file that row's anchor points at, then the selector re-run, its
result, and the artifact's new manifest and hash. A `TDD-ID` is unique within a
ledger, not across them, and one fixture is read by acceptance tests from
several specs — named by id alone, a re-verify could clear a hash mismatch on a
row in the wrong spec, or fail to clear the right one.

**The machine-readable form is fixed.** Write a `Shared-artifact re-verify`
heading with one `spec-NNNN/TDD-NNNN` subsection per consumer one level below
it, carrying these fields: `Evidence file`, `Revision`, `Selector`,
`Re-verify command`, `Re-verify result`, `Proof command`, `Proof result`,
`Restored GREEN command`, `Restored GREEN result`, `RED test manifest`, and
`RED test hash`. Both GREEN results are PASS outcomes, the proof result is the
observed failure, `Revision` names a tree in one of the two forms
`../../qfai-implement/references/evidence-revision.md` defines, and every
command is the exact command executed. Gate item 10 accepts a moved current
manifest only when this complete subsection targets the same spec/item,
evidence file and selector, and its manifest/hash recompute from the current
artifacts. Prose mentioning a re-run, or a subsection for another item, clears
nothing.

**And it is fixed where it is written, not only in what it says.** The record
goes **inside the editing row's own entry** — `#### Shared-artifact re-verify`
under that `### TDD-NNNN`, ahead of its review and checkpoint fields, so the
`audited evidence hash` its reviewers recorded covers these bytes. That
placement is the whole claim: a block written anywhere else is a paragraph
nobody audited, and one appended to the consumer's own `done` entry would be
the row clearing its own mismatch. Gate item 10 reads a record only from an
entry whose recorded `Spec` and `Code quality audited evidence hash` still
recompute over it, and never from the consumer's own item.

**When this stage has no row of its own, the record is stage-level.** A fresh
spec is the ordinary case here and can own no ATDD row at all, while still
creating and editing the fixtures a completed spec's handed-over rows read. With
the record tied to an "editing row" there was nowhere to put it: the re-run was
made and had no home, so the earlier row's `RED test hash` stayed mismatched
with nothing able to clear it, or the change was accepted unverified. Write the
same lines under `## Shared-artifact re-verify` in the stage evidence file
(`.qfai/evidence/atdd-<spec-id>.md`, beside `## Final status`), with
the same identity — spec and `TDD-ID` together — and the same "a passing re-run
is not enough on a row that has a proof" rule below. A consumer clearing a
mismatch reads **both** places: the editing row's entry when one exists, and the
stage block of any stage that touched the artifact. `/qfai-implement`'s gate
item 10 does not run on a spec with no rows, so this block is checked where the
stage's own pack seal is: it is inside the sealed stage evidence, so a record
added after the fact moves the seal. A stage block is read only from
`.qfai/evidence/coverage-depth-<spec-id>.md` and only when that file's
`## Final status` names its `Review pack` and a `Review pack seal` that still
recomputes from it — the stage has no item entry to hold an audit hash, so the
seal is what stands in its place.

**A passing re-run is not enough on a row that has a proof.** Weakening an
assertion helper, a snapshot or an expected-value fixture leaves the earlier
row's selector passing while making it tautological — and its recorded
`Oracle proof` was taken against the artifact as it was, so it no longer shows
what `qa-gatekeeper` requires: that the **current** test fails when the
predicate the row owns is broken. For each affected row that carries one,
re-run its original mutation — the one its `Oracle proof` plan or
`Satisfied-by` names — under the changed artifact, capture the failure, revert,
and record the restored GREEN, in the same `Shared-artifact re-verify` block.
A row whose mutation no longer fails the test is the tautology this exists to
catch, and the editing row does not reach `done` until it is repaired.

**This stage owns no production agent, so on a zero-row stage the mutation is
handed over.** Every phase here authors tests; none edits production code, and
the rows being re-verified are already `done`, so `/qfai-implement`'s named-row,
`todo` and `review-fix` entry paths do not reach them either. Left as written,
the stage had two ways out and both were wrong: edit production in breach of its
own Non-goals, or leave the shared fixture's mismatch permanently unclearable.
So define the handoff explicitly, and keep it transient: hand
`/qfai-implement` a **mutation-only request** naming, per affected row, its
`spec/TDD-ID`, the mutation its `Oracle proof` plan or `Satisfied-by` names, and
the selector to run under the changed artifact. That skill applies the mutation,
captures the failure, **reverts it in the same step** and returns the pair. It
does **not** reopen the row: the status stays `done`, no round block is opened,
and nothing is written to that row's evidence — the returned proof is recorded
here, in this stage's `Shared-artifact re-verify` block, like every other line
in it. A `done` row has no legal transition that would let it re-observe
anything, which is exactly why the proof belongs to the stage that moved the
artifact rather than to the row that owns the test. **A row whose re-run fails is not
re-verified** — it is a regression the editing row introduced, and the editing
row does not reach `done` until it is fixed, exactly as any other failure in
its own checkpoint.

**The earlier rows' entries are not touched**, and that is deliberate on two
counts. There is no legal reopen for them: `done` has one exit, the upstream
reset, and it requires an approved upstream change — a sibling editing a fixture
is not one. And their evidence is a record of an observation, not a claim about
the present: a `RED test hash` addresses the manifest **as it was when that RED
was taken**, which is the only thing it can honestly say. Appending to them
would also break the very verdicts that closed them, since the audit hash covers
the entry.

**And the consumer has to accept that pairing.** The completion gate
recomputes `RED test hash` for every handed-over row from the current manifest,
so an earlier row whose shared artifact was edited mismatches **by
construction** — and the mismatch route sends it back here for a fresh RED,
which a `done` row cannot take. A mismatch is cleared instead by a
`Shared-artifact re-verify` entry on the editing row that names this `TDD-ID`,
records the re-run and the re-taken proof, and carries the artifact's new
manifest and hash: that is the evidence the recomputation was looking for, made
where a row is still open. Without such an entry the mismatch stands.

So the pairing is: the earlier row keeps the observation it made, and the row
that moved the ground under it carries the proof that the observation still
holds. The editing row's own reviewers and checkpoint audit that proof, which is
what makes it evidence rather than an assertion.
