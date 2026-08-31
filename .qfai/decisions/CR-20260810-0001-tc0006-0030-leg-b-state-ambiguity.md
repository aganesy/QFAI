# Change Request

- ID: `CR-20260810-0001`
- Title: `TC-0006-0030 leg (b) does not say which shipped-workflows state it means, and its four governing sources disagree with opposite expected payloads`
- Raised by: `/qfai-implement orchestrator, after a three-lens review of TDD-0038 ruled that routing this to a steering note was the wrong instrument and the third recurrence of that class`
- Raised at: `2026-08-10T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (aganesy)` — via the /qfai-implement spec-0006 closure gate: AskUserQuestion
- Approved at: `2026-08-17T00:00:00Z`
- Approved option: `A` — split leg (b) by state
- Applied at: `2026-08-17T00:00:00Z` (`1f60a486`)
- Superseded by: `-`
- Blocked set: `(released 2026-08-17 by the Option A application at 1f60a486 — was: spec-0006 TDD-0038, TDD-0037)`

## Context

`TC-0006-0030` has three legs. Leg (b)'s Verify clause is `drift finding が 0 件 (不在は drift ではない)`,
and its Setup fixture is `当該 shipped workflow を削除した tree`.

**"Deleting the shipped workflow" does not identify a state.** The shipped-workflows contract defines five,
and two of them satisfy that phrase:

- **`declined`** — the provenance **entry** is present, the **file** is absent. Deleting a file is exactly
  this, since nothing removes the entry.
- **`absent`** — entry and file both absent.

These are **different production paths**, not two descriptions of one tree. `declined` is visited by the
comparison and answered by `hasDrifted`; `absent` is never visited at all, because the iteration domain is
`Object.keys(record.workflows)`.

## The four governing sources disagree

| Source                                                                  | What it says                                                                                                                                                     | Which reading it supports                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `06_Test-Cases.md:281` (Setup)                                          | `当該 shipped workflow を削除した tree`                                                                                                                          | **`declined`** on a literal reading                    |
| `03_Acceptance-Criteria.md:240` (`AC-0006-0023`, this row's own anchor) | `adopter tree に当該 shipped workflow が存在しない場合、drift finding は emit されない`                                                                          | **file-absent**, i.e. satisfied by _either_ state      |
| `.qfai/contracts/design/shipped-workflows.md:115,122-123`               | the state table gives `absent` = entry absent + file absent, and states plainly that "`absent` and `declined` are different states and are reported differently" | forces the ambiguity to be **resolved**, not inherited |
| `.qfai/contracts/cli/qfai-doctor.md:148`                                | `absent` → `(not emitted)`; "never installed; `qfai init` is the route, not a drift finding"                                                                     | **`absent`**                                           |
| `test-list.md` `TDD-0038` Selector                                      | `a shipped name with no provenance entry and absent from disk`                                                                                                   | **`absent`**                                           |

So the row's **own declared anchor** (`AC-0006-0023`) is the weaker, state-agnostic source, while the two
contracts and the ledger Selector point at `absent` — and the contract says explicitly that the two states
report differently, which means leg (b) cannot legitimately leave the choice open.

## Why this is a `defect` and not a preference: the two readings have OPPOSITE expected payloads

This is the part that makes it un-deferrable, and it appears in none of the sources above.

Under the **`declined`** reading, `BR-0006-0022` requires `details.declined` to **enumerate the name**.
Under the **`absent`** reading — the one `TDD-0038` implements — the row's central assertion is that the
name **appears nowhere in any `workflows.integrity` finding**.

An implementer cannot satisfy both. One requires the name present in the payload; the other requires it
absent from the payload. A single fixture cannot discharge leg (b) as written.

## Three further consequences the review measured

1. **Neither row that currently touches leg (b) asserts its literal Verify clause.** `drift finding が 0 件`
   is asserted by nothing: `TDD-0038`'s tree carries an edited control and asserts `findings` has length
   **1**, and `TDD-0029`'s second `it` carries an unreadable file and also yields a finding. The literal
   zero-finding case is unowned.
2. **The "jointly discharged" workaround does not carry traceability.** Attributing part of
   `TC-0006-0030` to `TDD-0029` fails because that row is bound to `TC-0006-0027`, and
   `drift.test.ts` carries only `TC-0006-0027`/`0028` markers — there is no `TC-0006-0030` marker to carry
   the attribution. And `drift.test.ts`'s second `it` deletes a **recorded** file, i.e. it implements the
   **`declined`** reading, which is the opposite of what `TDD-0038` asserts.
3. **Leg (b) overlaps `TC-0006-0035` / `TDD-0037`** (`declined`-only tree emits no drift finding), which is
   still `todo`. Whichever reading leg (b) takes, the boundary with that TC needs stating so the two rows
   are not asserting the same thing under different IDs — or contradicting each other.

## Options

**Option A — split leg (b) by state (recommended).** Reword the Setup so each leg names the enum state it
means, and split the Verify clause: an `absent` tree emits no finding at all; a `declined` tree emits no
**drift** finding but `details.declined` enumerates the name. Then state the `TC-0006-0035` boundary. Cost:
one `/qfai-sdd` pass touching `06_Test-Cases.md` and possibly `03_Acceptance-Criteria.md`; likely one new
TDD row for the literal zero-finding case; `TDD-0038` stands as the `absent` leg unchanged.

**Option B — scope leg (b) to `absent` only** and move the `declined` behaviour wholly to
`TC-0006-0035` / `TDD-0037`. Cheaper, and it matches both contracts and the Selector. Cost: the literal
`drift finding が 0 件` clause still needs an owner, and `AC-0006-0023`'s wording stays state-agnostic and
so stays capable of regenerating this ambiguity.

**Option C — scope leg (b) to `declined` only**, matching the Setup's literal reading. **Not recommended**:
it contradicts `qfai-doctor.md:148` and the ledger Selector, it collides head-on with `TC-0006-0035`, and it
would require `TDD-0038` to be rewritten to assert the name **present** in `details.declined` — the exact
inversion of what it now asserts and what its review confirmed.

## Why a Change Request rather than the steering note first written

`constitution/drift-protocol.md#when-drift-is-detected` puts a **`Class: defect`** finding in upstream SSOT
on the Change Request path. The first instrument used here was handoff item 14, a non-blocking steering
note, on the reasoning that the row was discharged and nothing waited on it. The review overturned that on
two grounds: the discrepancy is a **four-artifact** inconsistency rather than the one-versus-one the note
described, and the row is **not** cleanly discharged, because the literal Verify clause is unowned and the
joint-discharge workaround lacks a traceability marker.

This is the **third** time in this slice that a defect-class upstream finding was first routed to a weaker
instrument. Handoff item 14 is being reduced to a pointer at this CR, with its "the row is discharged"
claim and its inverted `drift.test.ts` citation removed.

## Blocked set narrowed 2026-08-11: `TDD-0039` is separable, measured

It was first listed on the ground that it shares `TC-0006-0030` with the ambiguous leg. **That reasoning was
wrong, and sharing a TC is not sharing an axis.**

Measured at **`workflowsIntegrity.ts:284-293` as of `a67ed0c7`** — the resolve at `:284`, the guard at
`:285`, the `skipped_unresolved` return at `:287`, its closing brace at `:293`, and `readInstallProvenance`
at `:301`. _Corrected: this first cited `:276-285`, and the implementer's own currency note cited
`:281-290`; both were wrong, and a reconciling reviewer had to measure the file to settle it. A line
citation without a revision anchor is a currency claim, which is the class this slice has repeatedly paid
for._ Leg (c)'s condition is
`resolvePackagedWorkflowsDir() === undefined`, and its early return fires **before the provenance record is
read at all** and before any per-name comparison. So leg (c) turns on a **packaged-side** resolution failure,
while this CR's ambiguity is entirely about which **adopter-side** state (`absent` vs `declined`) leg (b)
means. No option A/B/C changes leg (c)'s fixture, its expected severity, or its expected `modified` list.

`TDD-0038` and `TDD-0037` stay blocked: `TDD-0038` implements the `absent` reading and Option C would require
it rewritten to assert the inverse, and `TDD-0037` owns `TC-0006-0035`, whose boundary with leg (b) is one of
the things this CR must settle.

**What the narrowing released, stated precisely** — `completion-reviewer` upheld the substantive conclusion
while ruling the record imprecise. `drift-protocol.md#when-drift-is-detected` is read here at **leg
granularity**, not TC granularity: an open `Class: defect` finding blocks the legs whose meaning it
governs, not every row citing the same TC. So the narrowing released `TDD-0039`'s **editing and its route
to `green`** — it released nothing about leg (b), and it does **not** make `TC-0006-0030` discharged. The
row's own anchor `AC-0006-0023` (`03_Acceptance-Criteria.md`) is unaffected by any option A/B/C.

Recorded because over-scoping a blocked set stalls work for nothing, and because the first version of this
line was written from _which TC a row cites_ rather than from _what its code path depends on_.

## Resolution

**Option A, applied at `1f60a486`** through a narrow `/qfai-sdd` owner-phase rerun. Two
`UPDATE:MODIFY` operations, no id created, renumbered or removed; recorded in
`spec-0006/09_delta.md` as `OP-016` / `OP-017`. `sdd validate --spec spec-0006` exits 0 at
`error=0`.

`TC-0006-0030`'s Setup now names the enum state each leg means, leg (b) is a per-name claim about
the `absent` state, and a boundary paragraph points `declined` at its real owners. `AC-0006-0023`'s
state-agnostic `And` — the clause this CR named as capable of regenerating the ambiguity — is split
the same way and re-homes the spec-0003 / REQ-0020 ownership deferral pointer that leg (b) used to
carry.

### Three rulings taken against this CR's own text, each measured rather than argued

1. **No new TC or TDD id**, against Option A's hedge that the split would "likely" need one for the
   literal zero-finding case. `declined` is already owned by `TC-0006-0034` and `TC-0006-0035` with
   ledger rows `TDD-0036` / `TDD-0037` at `todo`, and the zero-**check** case is the empty
   provenance-record tree — a different fixture series. Minting an id would give one production
   predicate two owners, which is a traceability defect rather than added coverage.
   `test-design-analyst` and `architecture-reviewer` reached this independently.
2. **Not "an `absent` tree emits no finding at all"**, which is this CR's own phrasing.
   `TDD-0038`'s landed fixture seeds a control stale file and asserts `findings` has length 1 at
   `severity === "info"`, so that wording contradicts the very test this CR requires to stand
   unchanged.
3. **The `ok` severity claim stays out of leg (b).** Read from production rather than from prose: a
   declined tree keeps `comparedCount > 0`, so `status` resolves to `"ok"` and one check registers at
   severity `ok`. True of `TC-0006-0035`'s declined-only tree; false of `TC-0006-0034`'s mixed tree,
   where the same check is `info`. An unscoped claim would have been false.

### What the review caught, and one defect of the applying stage

Both routed reviewers returned `REVISE` independently, five blocking findings, all folded in: an
**MD013 breakage caught by character count** (the drafted Setup line was 405 chars and leg (b) 287,
against a 200 limit — the applied text peaks at 90); a cross-reference naming `TC-0006-0028` as the
_owner_ of the zero-check case when its Setup is the content-identical tree, rewritten as an
exclusion; and a `declined` clause that **restated** `AC-0006-0026`'s payload obligation instead of
pointing at it, creating a second SSOT for one predicate — the same defect class this CR was raised
to close — with a parenthetical that was both self-contradictory and false against the code.

The applying stage also wrote an `AC` → `BR` reference, which `TRACE_DOWNSTREAM_REF` rejected:
references run lower-to-upper only, so an `AC` may not cite a `BR`. Removed; the same-layer
`AC-0006-0026` pointer stands.

### Carried forward, outside this CR's anchor

`AC-0006-0026` and `BR-0006-0022` both state that a declined-only tree emits no finding at all. That
is **false against the code** by the same measurement as ruling 3 — an `ok` check registers.
`TC-0006-0035` already says `ok`, so the TC is right and its two parents are wrong. `TDD-0037`
implements against them. Recorded in
`.qfai/steering/2026-08-08-chg-007-spec-0006-upstream-handoff.md` under `## Open questions`.
