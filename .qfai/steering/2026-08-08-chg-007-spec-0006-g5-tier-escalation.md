---
id: 2026-08-08-chg-007-spec-0006-g5-tier-escalation
status: active
kind: decision
created: 2026-08-08
updated: 2026-08-08
scope: spec-0006
blocking: false
promote-to: null
links:
  - spec-0006
  - TDD-0032
  - TDD-0038
  - TDD-0039
---

# `TDD-0039` escalated from T1 to T2, and the cross-row precondition that forced it

The plan assigns **T1 to both `TDD-0038` and `TDD-0039`**, reviewed together as group G5, with the
criticality test recorded as "contract and public-JSON surface, not mutation risk — the check writes
nothing". Re-derived at the point of use rather than recalled, because the emission site this ledger
shares has changed three times since the plan was written.

## Decision

- **`TDD-0039` → T2**, reviewed alone.
- **`TDD-0038` → T1**, reviewed as a singleton. All three reviewers still run; the tier scales how
  often a gate runs, never whether.
- Cost, stated rather than absorbed: **one extra review cycle** over the planned group of two.

## Why

1. `TDD-0039` introduces a **third emission branch into the public `checks[]` array**. Today
   `skipped_unresolved` emits nothing — the drift branch requires `status === "modified"` and the `ok`
   branch requires `status === "ok"`, so an unresolvable packaged directory falls through both.
   `TDD-0039` requires severity `info` with an empty `modified`. That is the recorded T2 criterion
   applied to the one surface that has yielded a real, ship-blocking defect on **every** row that has
   touched it in this slice.
2. **The `TDD-0030` precedent postdates the plan.** `TDD-0030` was planned T1, received T2 ceremony in
   practice for adding a new severity to this same array, and that ceremony caught two defects that
   would otherwise have shipped: locale-dependent ordering on a public JSON surface, and an `ok`
   emission making a positive claim about an unchecked tree for the entire installed base. A tier a
   row's own sibling was escalated out of is not a tier.
3. It **retroactively invalidates a sibling row's recorded coverage attribution** (below). No group
   review is scoped to catch that, because the affected artifact belongs to a different row.
4. Its severity **collides** with the drift finding's — both `info` — which weakens a sibling guard.

## The cross-row conflict, recorded before `TDD-0039`'s work starts

`TDD-0032`'s guard #1 records two reaching mutations, both producing genuine absence, which is what
makes `expected undefined to be defined` non-degenerate there. One of them is **an unresolvable packaged
directory**. When `TDD-0039` lands, that mutation stops producing absence — it emits an `info` finding —
so the attribution becomes false on the day `TDD-0039` ships. The guard itself survives, because its
second mutation (inverting the row's own `modified.length > 0` gate, which leaves `status` at
`"modified"` so the `ok` else-if is false too) still yields absence, and the comment already names it as
the better proof of the two.

Guard #2 is affected in a second way. Its scope is "closes a vacuity of the token sweep and the
registration pin", reached by severity `ok`. After `TDD-0039` there is a **second** such emission that
also carries no command token and is registered once — and it shares the drift finding's `info`, so
`not.toBe("ok")` cannot separate the two. The row stays closed, because the equality **pin** catches it,
but the pin becomes the only thing separating the two `info` emissions.

### Hard precondition on `TDD-0039`, discharged in-row and not as a follow-up

1. Re-measure the unresolvable-directory mutation against the post-`TDD-0039` code and correct
   `TDD-0032`'s guard #1 comment to name only the mutations that still reach it.
2. Correct guard #2's scope comment for the second `info` emission.
3. Re-run `TDD-0032`'s file. **Predicted green** — its fixture drives a genuinely modified file, so
   `status === "modified"` and the skip branch is untouched. The prediction is recorded here, before the
   change, so that a surprise is visible as one rather than explained afterwards.

`references/cross-spec-ownership.md` imposes the analogous duty for cross-**spec** edits. This is
cross-**row** inside one spec, which that reference does not cover; this entry is the local equivalent,
recorded as a decision rather than invented as policy.

## The general property this is an instance of

Five times in this slice a recorded model has been invalidated by a neighbouring row: a reviewer's reach
ruling (twice), an assumption that a sibling's `toBe` covered the drift `title`, a `details` premise
that had never been measured, and now this attribution. The cause is structural: **every row in this
ledger writes the same two production modules and the same emission site**, so any coverage attribution
naming a mutation there is a claim about a _revision_, not a fact.

The rule one reviewer derived from its own error — "a reach ruling must be re-derived from the current
file, never recalled" — is therefore not reviewer hygiene but a property of this ledger's shape. The
remaining rows should be planned as if every attribution they write has a half-life of one row.

## Re-derived at round 7 (2026-08-09), not assumed

This entry's whole argument is that a coverage attribution in this ledger has a half-life of one row, so
it would be self-refuting to leave the precondition unchecked across seven rework rounds. Re-derived
against `152dc587`:

- **Both guards survive.** Guard #1 (`toBeDefined` on the registered check) is at
  `spec0006WorkflowsIntegrity.repairText.test.ts:227`; guard #2 (`not.toBe("ok")`) at `:243`. Round 7
  deleted the rendered-surface sweep and its presence control, not the preconditions.
- **The `TDD-0039` conflict is unchanged and still owed.** Making `skipped_unresolved` emit at severity
  `info` still stops the unresolvable-packaged-directory mutation from producing absence, so it still
  falsifies that attribution on the day `TDD-0039` ships, and guard #1 still survives on its second
  mutation.
- **Guard #2's exposure is unchanged**: `not.toBe("ok")` still cannot separate the drift finding's `info`
  from the new skip finding's `info`, so the equality pin remains the only thing that does.
- **One thing did change in `TDD-0039`'s favour.** With the `title` + `details` sweep deleted, the surface
  `TDD-0039`'s new emission lands on is narrower — the row now pins only `message` (exactly), `severity`
  (as not-`ok`), and registration count. That reduces, but does not remove, the number of `TDD-0032`
  assertions a third emission branch can perturb.

The three in-row precondition steps are unchanged, including the recorded prediction that `TDD-0032` stays
green — its fixture drives a genuinely modified file, so `status === "modified"` and the skip branch is
untouched.
