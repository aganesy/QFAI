# The record contract (what gate item 10 checks)

Gate item 10 is the record check. It asks one question — can the next reader
trust this row's record? — and nothing it reports means the software is wrong.
The gate states it in one sentence and points here. This file carries the rule
the gate line moved out. Item 10's other checks stay beside the fields they
constrain, and `#the-item-10-checks-written-elsewhere` lists where. An audit
reads this file and follows that list; either one alone leaves the other's
checks unrun.

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

**Compatibility:** an `E2E` / `API` / `Integration` row advanced past `todo`
before its layer's split has its evidence and anchor in `implement-<spec-id>.md`,
which was the contract at the time. `Integration` moved to the ATDD file one
release **after** `E2E` / `API`, so its legacy rows are the newest of them and
are covered here too.

**Identify it by a marker, not by its status**: the row carries
`Pre-split-evidence: implement` in its `Evidence` cell. Status and anchor alone
cannot tell a legacy row from a new `E2E` / `API` row written to the wrong
file — which would let a row that never produced its ATDD handoff be accepted
as complete.

**A row with no marker is judged by the current rule whatever its status**,
which for an `E2E` / `API` / `Integration` row means the ATDD file: status and
anchor alone cannot tell a legacy row from one written to the wrong file after
the split, and accepting the implement anchor without the marker let a row that
never produced an ATDD handoff pass the gate as complete. It is also why the
pass that writes the marker reads the commit that last advanced the row against
its layer's split, rather than the anchor alone.

**A row that carries the marker** is the legacy case, and its implement anchor
is accepted — it has no ATDD entry to produce, and a `done` row has no legal
transition that would let it re-observe a RED, so requiring the new location
would make an already-complete row permanently ungateable.

A row advanced **after** the split writes to the file its `Layer` owns. The
compatibility above reaches backwards only.

## Who writes the marker

**Item 10 reads the marker; it never writes one.** The pass that writes it is
`Phase: Stage 0 + Preflight` step 3, and `pre-split-evidence-migration.md` is
its rule: one pass per repository, behind its own flag, over every ledger in
the tree. Until it has run, an unmarked legacy row is reported rather than
accepted, and running it is what clears those rows.

Writing it at item 10 instead put a repository-wide history migration inside a
per-item completion check and gave it no phase that ever ran it, so the rows it
was meant to clear stayed permanently unable to finish.

## The seals and hashes the gate recomputes

Every `Review pack seal` the entry carries — one per review attempt, not one
per round (`round-evidence.md`) — is recomputed here from the
`review-<timestamp>/` directory it names
(`evidence-revision.md#review-pack-seal`), and a mismatch means that pack was
edited after its attempt closed.

Each reviewer verdict's `Audited evidence hash` is **recomputed** here over the
entry's phase-authored fields: the revision excludes `.qfai/evidence/**`, so
this is the only thing that tells a verdict passed on the evidence as read from
one passed on evidence edited afterwards. The `Prototype parity` verdict's
subject also takes the captures its `Surface artifacts` manifest names, and
where one is absent from the checkout the recorded fields are checked instead
(`review-artifact-layout.md`).

A verdict carrying a `Record re-attestation` is compared against **that** hash
and not the superseded original — a record repair moved the bytes the original
read, by design — and the re-attestation's `Record re-attestation pack seal` is
recomputed here beside the attempt's `Review pack seal`, each from the pack it
names. The re-attestation is written as a pack of its own for exactly this
reason: neither seal is ever edited, so a repaired record stays checkable
rather than becoming an untraceable rewrite of a sealed pack
(`.qfai/assistant/constitution/drift-protocol.md#the-record-defect-queue`).

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
  (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`).
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

## Which revision each observation names

Of the item's four sub-agent observations (items 3, 5, 7, 8), **only items 7
and 8 judge the final tree**, and they name the **same** revision as item 6's
post-refactor re-confirmation — `Refactor verify revision`
(`evidence-revision.md`, whose table says which tree each of items 3, 5, 6, 7
and 8 addresses).

And **on a UI-affecting row item 9's `Prototype parity reviewed revision` shares
it too**, because the parity verdict is an observation of the rendered surface
and a PASS taken before the UI moved is stale in exactly the sense this rule
defines. It is the one verdict no later reader can re-derive from the spec and
the diff, so leaving it out let a row reach `done` on a surface nobody had
looked at since.

**Item 3** cannot be taken against the final tree on any row: a RED precedes
the code that makes it pass, and a `falsifiability` row's mutation run is taken
against a tree reverted before the GREEN. It names its own field (`RED
revision`, or `Falsifiability revision` in its place).

**Item 5** cannot either: the GREEN is observed before Phase: Refactor, and
step 4 there requests the reviews from `refactor` and never from `green`, so a
refactor that changes one byte moves the address by construction. Demanding
that item 5 agree with items 7 and 8 made this gate and item 6 jointly
satisfiable only by a refactor that changed nothing. It keeps its round block's
`Revision`.

That is the property those observations are worth having, not a defect in them;
demanding one revision across all four made an `observed-red` E2E/API row
unable to reach `done` however correct its evidence was. Such a row's RED names
the revision it was observed at, items 6, 7 and 8 agree among themselves, and
the reviewer checks that the handed-over RED names this row's selector and the
predicate it owns rather than that it matches the final tree.

## A shared-artifact re-verify entry stands in for what it re-took

**A `## Shared-artifact re-verify` entry naming this row is read in place of
the per-item observations it re-took**, and not only to clear the `RED test
hash` mismatch above.

A spec-level checkpoint repair moves the tree a `done` row's GREEN, verdicts
and checkpoint were taken against, and that row's own entry is deliberately not
rewritten — appending to it would break the `Audited evidence hash` of the
verdicts that closed it
(`checkpoint-verification.md#repairing-a-per-spec-fail`).

So where such an entry names this row — its spec and `TDD-ID` together — items
5, 7-9 and 12 are satisfied by what it carries at the `Revision` it names: the
row's selector re-run, its `Oracle proof` re-taken (or, where the repair moved
what an assertion asserts, the fresh falsifiability evidence that reference
requires in item 3's place), a fresh verdict from every required reviewer, and
the boundary's own re-run of the whole per-spec set. That `Revision` is then
the one those items agree on.

Reading the entry alone left every correctly re-verified row stale for ever:
the re-observations exist, and the gate was looking at the fields the repair
invalidated instead.
