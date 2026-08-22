# Cross-spec Code Ownership

What to do when implementing one spec correctly requires changing something
another spec's `done` rows certify.

## Why this needs a rule at all

`/qfai-implement` constrains execution to **one spec** and scopes every artifact
it writes — the ledger, the evidence file — to that spec. The codebase is not
partitioned at all, qfai defines no module → owning-spec index, and the Refactor
phase **mandates** duplication removal one line before this rule applies.

So the collision is the normal case, not an edge one. And both available
outcomes used to violate a shipped rule:

- change the file, and spec A's `done` rows now certify behaviour that was
  re-tested by nobody — `done` has no outbound edge, so those rows cannot be
  reopened;
- do not change it, and the Refactor phase's own instruction is unmet, and
  spec B ships a duplicate.

Neither left any trace under `.qfai/**`. `drift-protocol.md`'s upstream list
contains no code or test artifacts, so the STOP → Change Request → owner-rerun
route never fired for them.

## The rule

**A production module another spec's ledger names in `Owning module` is that
spec's to certify.** So is a test file another spec's ledger names in
`Test file`, for the narrower case where the file being edited is itself that
spec's test. In both columns it is the `done` rows that carry the certification
— `constitution/drift-protocol.md` reads the two columns the same way. Editing
such a file does not require permission — it requires a record and a re-review.

1. **Detect.** Before editing a production file **or a test file** — in **any
   phase**, not only Refactor, because Phase Red writes to a test file before
   Refactor is ever reached — look the file up in every other spec's
   `tdd/test-list.md`, reading only the rows at `Status = done`. Those are the
   rows this rule protects: `done` has no outbound edge, so what they certify
   cannot be re-tested by reopening them, while a `todo` / `red` / `green` row
   has its run still ahead of it and needs no obligation. A `done` row matches
   in either of two ways, and either one means the edit is cross-spec.
   - **Direct.** The file is that row's `Owning module` — the only column that
     holds a production path (`execution-ledger.md`) — or, when the file being
     edited is itself a test, that row's `Test file`.
   - **Reverse dependency.** The row names the file in neither column, but a
     test it does name reaches it. Walk the reverse dependency closure of the
     file about to be edited out to the tests that exercise it
     (`relevant-test-suite.md`), then look those paths up in that row's
     `Test file`. This applies to **every `done` row that did not match
     directly**, declared or not: in the ordinary reverse-dependency shape
     `relevant-test-suite.md` describes — a shared module behind a service
     behind that service's test — the fallback leaves a row that declares
     `src/service.ts` unmatched exactly as it leaves an undeclared one, and `-`
     is legal **per row**, so a ledger's declared rows never clear its
     undeclared ones. An undeclared seam is a
     restriction, not a clearance — the same reading `execution-ledger.md` gives
     it for parallel dispatch. Detection never passes silently just because the
     column is absent.

   **Normalize before comparing.** `Owning module` legally holds a
   repo-relative path **or** a dotted module path (`execution-ledger.md`).
   Decide which form the cell holds **before** touching its dots — a value
   carrying `/` or ending in a source extension is a path — and read `.` as a
   separator **only** in the dotted form, so `src/foo.bar.ts` keeps its dot
   instead of collapsing onto `src/foo/bar.ts` and manufacturing a hit. Then
   compare with the source-root prefix and the extension dropped:
   `shirube.domain.notification` and `src/shirube/domain/notification.ts` are
   the same module and must match.

2. **Record.** Add a `## Cross-spec obligations` entry to this spec's evidence
   file (fields below).
3. **Re-review.** Run `completion-reviewer` against the affected specs'
   obligations as well as this one's. The reviewer is the party that can say
   whether the other spec's assertions still hold.
4. **Do not close over it.** An open entry is a completion prohibition
   (`qfai-implement/SKILL.md#completion-prohibition-conditions`).

## The evidence entry

Per affected spec, in the evidence file the row's `Layer` owns (`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` row):

| Field                | Meaning                                                       |
| -------------------- | ------------------------------------------------------------- |
| `TDD-ID`             | the row in **this** spec whose work forced the change         |
| `Blocked spec`       | the spec whose `done` rows the file belongs to                |
| `Blocked TDD-IDs`    | the rows in that spec that name the file                      |
| `File`               | the exact path changed                                        |
| `Change required`    | what had to change, in one sentence                           |
| `Obligation at risk` | what that spec asserted about the file that is now unverified |
| `Resolution`         | `re-reviewed` (the reviewer confirmed it holds) or `CR-*`     |

`Obligation at risk` is the load-bearing field. "Changed a shared helper" is not
a record; "spec-0004 TDD-0012 asserts this helper rejects an empty batch, and
that path is now routed through the new guard" is.

## When re-review is not enough

If the other spec's obligation genuinely no longer holds — the behaviour it
asserted has changed, not merely moved — that is upstream drift, and
`constitution/drift-protocol.md#when-drift-is-detected` governs from step 1.
Record the CR id in `Resolution`. Re-review cannot ratify a behaviour change the
other spec never agreed to; only its owner can.

## What this does not do

It does not partition the codebase, and it does not give `done` an outbound
edge. Both are larger changes. What it does is make the collision **visible and
blocking** instead of silent — the two outcomes above are still the two
outcomes, but neither can now be taken without a record that names the
obligation it puts at risk.
