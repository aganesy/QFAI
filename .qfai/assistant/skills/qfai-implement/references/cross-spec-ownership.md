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

**A file another spec's ledger names in `Test file` is that spec's to certify.**
Editing it does not require permission — it requires a record and a re-review.

1. **Detect.** Before editing a production file in Refactor, search every
   `tdd/test-list.md` for it. A hit means the edit is cross-spec.
2. **Record.** Add a `## Cross-spec obligations` entry to this spec's evidence
   file (fields below).
3. **Re-review.** Run `completion-reviewer` against the affected specs'
   obligations as well as this one's. The reviewer is the party that can say
   whether the other spec's assertions still hold.
4. **Do not close over it.** An open entry is a completion prohibition
   (`qfai-implement/SKILL.md#completion-prohibition-conditions`).

## The evidence entry

Per affected spec, in the evidence file the row's `Layer` owns (`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row — the ATDD-owned set `qfai-implement/SKILL.md` Non-goals defines). **A row carrying `Pre-split-evidence: implement` keeps `implement-<spec-id>.md`** (`qfai-implement/SKILL.md` gate item 10): the marker is what makes a legacy row's implement anchor the one item 10 accepts, so that is where its effective evidence is. Recording such a row's entry on the ATDD side puts the open obligation in a file neither item 10 nor the completion prohibition reads for it, and a Refactor that changes another spec's file could then be declared complete with that spec's re-review still open — the same separation this paragraph exists to prevent, mirrored. The whole `## Cross-spec obligations` entry goes in that one file: item 10 and the completion prohibition read the layer-owned file, so recording an ATDD-owned row's entry in `implement-<spec-id>.md` separates the blocking record from the file the gate reads and lets completion be declared with the other spec's re-review still open.

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
