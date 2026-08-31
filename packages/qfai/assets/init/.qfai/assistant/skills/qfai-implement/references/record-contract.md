# The record contract (what gate item 10 checks)

Gate item 10 is the record check. It asks one question — can the next reader
trust this row's record? — and nothing it reports means the software is wrong.
The gate states it in one sentence and points here; this file carries the rule
the gate line moved out, and names item 10's remaining checks where they
already stand (`#the-item-10-checks-written-elsewhere`). Read both, or the
checks that are stated at the place they constrain go unrun.

It is addressed to whoever audits a record or writes the validator that reports
on it. An agent building a row does not need to read it to build the row: that
is items 1-9, 11 and 12.

## The evidence file a row's `Layer` owns

`test-list.md` Status is current and its Evidence cell's anchor resolves to a
fresh per-item entry in the evidence file its `Layer` owns —
`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md`
for an `E2E` / `API` / `Integration` row, whose RED provenance was produced by
the stage that authored its test. `/qfai-atdd` owns all three, because
`QFAI-ATDD-112` puts every `L3` and undeclared-`Level` TC in
`tests/integration/**` and its P4 writes those tests
(`execution-ledger.md#atdd-owned-rows`).

The cell is a pointer, not the payload
(`execution-ledger.md#evidence-cell-contract`).

## Compatibility: a row that predates the evidence split

**Compatibility:** an `E2E` / `API` row that reached `done` or `review-fix`
before this split has its evidence and anchor in `implement-<spec-id>.md`,
which was the contract at the time.

**Identify it by a marker, not by its status**: the row carries
`Pre-split-evidence: implement` in its `Evidence` cell. Status and anchor alone
cannot tell a legacy row from a new `E2E` / `API` row written to the wrong
file — which would let a row that never produced its ATDD handoff be accepted
as complete.

**A row with no marker is judged by the current rule whatever its status**,
which for an `E2E` / `API` row means the ATDD file: status and anchor alone
cannot tell a legacy row from one written to the wrong file after the split,
and accepting the implement anchor without the marker let a row that never
produced an ATDD handoff pass the gate as complete.

**A row that carries the marker** is the legacy case, and its implement anchor
is accepted — it has no ATDD entry to produce, and a `done` row has no legal
transition that would let it re-observe a RED, so requiring the new location
would make an already-complete row permanently ungateable.

## Migration: writing the marker (one pass, opened 2026-08-22)

A one-off pass over an existing ledger, not a rule a new row is built against.
A ledger that has had it run, or that has no row older than the split, is done
with this section for good.

**Write it once, from the history**: for **every** `E2E` / `API` row past
`todo` — `red` and `green` and `refactor` as much as `done` and `review-fix` —
check whether its `Evidence` anchor pointed at `implement-<spec-id>.md` in the
commit that last advanced it. A row interrupted mid-cycle by the upgrade has
legitimately stored evidence there too, and skipping it left that row unable to
finish: unmarked, it is judged by the current rule whatever its status, so the
evidence it lawfully wrote was rejected at item 10.

Find that commit from the row's **patch history**, not with `git log -S`: the
id is on both sides of a status-only change, and `-S` matches a filepair only
when one side contains the string, so it walks back to the commit that _added_
the row instead. `git log -p -- <test-list.md>` and take the newest commit
whose hunk changes that `TDD-ID`'s line (`git log -L` on the row also works
where the line is stable). If its anchor named the implement file, append the
marker. A row advanced after the split has an ATDD anchor there and gets none;
it writes to the file its `Layer` owns.

Run it as part of taking this version; until it has run, those rows are judged
by the current rule, which is the safe direction: they are reported, not
silently accepted.

## The seals and hashes the gate recomputes

`Review pack seal` is recomputed here from the `review-<timestamp>/` directory
it names, and a mismatch means the pack was edited after the round closed.

Each reviewer verdict's `Audited evidence hash` is **recomputed** here over the
entry's phase-authored fields: the revision excludes `.qfai/evidence/**`, so
this is the only thing that tells a verdict passed on the evidence as read from
one passed on evidence edited afterwards.

A verdict carrying a `Record re-attestation` is compared against **that** hash
and not the superseded original — a record repair moved the bytes the original
read, by design — and the re-attestation's `Record re-attestation pack seal` is
recomputed here beside the round's `Review pack seal`, each from the pack it
names. The re-attestation is written as a pack of its own for exactly this
reason: neither seal is ever edited, so a repaired record stays checkable
rather than becoming an untraceable rewrite of a sealed pack
(`../../../constitution/drift-protocol.md#the-record-defect-queue`).

## The item 10 checks written elsewhere

These are item 10's as much as the rules above, and they are normative where
they stand — each is stated beside the field it constrains, so do not restate
it here, follow the pointer. All three guard the same substitution: the ledger
and `.qfai/evidence/**` are both excluded from the revision, so a row's
identity, its obligation, its `DR-ID` and its handed-over test can all be
swapped after a PASS with every hash and revision unmoved, and an audit that
stops at this file lets the old verdict stand for the new row.

- **Row identity and the obligation reference are checked against the ledger,
  not merely hashed**: item 10 reads `TDD-ID`, `Layer`, `Test file`, `Selector`
  and the obligation reference the row's `Layer` selects (`TC-Refs` /
  `US-Refs` / `CON-API-Refs`) from `test-list.md` and requires them to equal
  the copy the verdict hashed
  (`../../../constitution/shared-skill-delegation-baseline.md#reviewer-response-template`).
- **An `exception` row's `DR-ID` and obligation are checked the same way**: the
  verdict must name the `DR-ID` the row currently carries, and its obligation
  reference is checked against the ledger too (branch 3 of that same
  reference). There is no RED and no GREEN on that branch, so the DR is the
  whole evidence and a swapped pointer is the whole forgery.
- **A handed-over `E2E` / `API` / `Integration` row's `RED test hash` is
  recomputed here, not read** — over the same inputs the producer hashed, in
  the manifest order `../../qfai-atdd/references/red-provenance.md` defines,
  and cleared only by a `Shared-artifact re-verify` entry that names this row
  (`../SKILL.md#per-item-evidence-contract-fresh-evidence-required`). Without the
  recomputation a stale RED passes item 10 exactly as a fresh one does.

## One revision across the four observations, except item 3

The item's four sub-agent observations (items 3, 5, 7, 8) all name the **same**
revision (`evidence-revision.md`) — **except item 3**, which cannot be taken
against the final tree on any row: a RED precedes the code that makes it pass,
and a `falsifiability` row's mutation run is taken against a tree reverted
before the GREEN. It names its own field (`RED revision`, or `Falsifiability
revision` in its place); items 5, 7 and 8 share `Revision`.

That is the property that RED is worth having, not a defect in it; demanding
one revision across all four made an `observed-red` E2E/API row unable to reach
`done` however correct its evidence was. Such a row's RED names the revision it
was observed at, items 5, 7 and 8 agree among themselves, and the reviewer
checks that the handed-over RED names this row's selector and the predicate it
owns rather than that it matches the final tree.
