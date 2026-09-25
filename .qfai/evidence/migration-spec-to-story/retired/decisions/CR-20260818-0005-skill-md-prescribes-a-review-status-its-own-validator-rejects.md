# Change Request

- ID: `CR-20260818-0005`
- Title: `SKILL.md tells adopters to write status: "REVISE" into a review pack, which its own reference, its own README and its own validator all reject`
- Raised by: `completion-reviewer (advisory A-2), spec-0006 round 3; re-measured against the validator source before filing`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — correct the sentence to status: FAIL
- Applied at: `2026-08-23T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `(none — the packs written for spec-0006 followed the reference, not this sentence, so nothing here is blocked)`

## The measurement

`packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md:337` — and its `sync:ssot`
mirror at `.qfai/assistant/skills/qfai-implement/SKILL.md:337` — read:

> Each review round creates a new pack. Full schema and the `REVISE` -> `status: "REVISE"` mapping:
> `references/review-artifact-layout.md`

The reference it points at says the opposite, at `references/review-artifact-layout.md:24`:

> A `REVISE` verdict during iteration is written as `status: "FAIL"` here

So does `.qfai/review/README.md`. And so does the validator: `ALLOWED_ROSTER_STATUS` in
`packages/qfai/src/core/validators/reviewArtifacts.ts` is `new Set(["PASS", "FAIL", "NA"])`.

**A pack written to `SKILL.md`'s sentence fails `QFAI-REVIEW-007`.** The sentence does not merely
disagree with its own cross-reference; it prescribes a value the tool rejects, in the same breath as
telling the reader where the real schema is.

## Why it is worth a CR rather than a quiet edit

It is in the **distributed surface** — `packages/qfai/assets/` — so it reaches every adopter tree that
runs `qfai init`. The failure it produces is not obvious from the error: an adopter following the
skill's own instruction gets a validation failure whose remedy is stated three files away, and the
document that misled them is the one they will re-read first.

It is also the shape this repository treats as a defect elsewhere: a claim refuted by its own
artifact. `SKILL.md` and `review-artifact-layout.md` ship together, are read together, and disagree.

Not raised as blocking against the four spec-0006 rows: their packs were written to the reference's
mapping and are machine-valid (`validate --profile verify` reports zero `QFAI-REVIEW-*` over twelve
packs). Satisfying `SKILL.md`'s sentence would have made them invalid.

## Options (at least 3) and recommendation

### Option A — correct the sentence to `status: "FAIL"` (recommended)

One string in the shipped asset, plus the `sync:ssot` mirror. It aligns the skill with the reference,
the README and the validator in a single edit, and it makes the cross-reference honest rather than
merely present.

Cost: an asset edit and a mirror sync. If a test pins the current wording, it co-changes; grep before
editing, since this repository has been bitten more than once by shipped prose whose assertions live
in a test.

### Option B — remove the mapping from `SKILL.md` and cite the reference only

"Full schema and the verdict-vocabulary mapping: `references/review-artifact-layout.md`". Strictly
less to keep in sync — the mapping then has exactly one home. Cost: a reader who wanted the answer
inline has to follow the link, which is a small regression in a document whose job is to be
followable in one pass.

### Option C — widen `ALLOWED_ROSTER_STATUS` to accept `REVISE`

Make the tool accept what the skill says. Cost: it adds a third spelling for one concept to a
persisted artifact schema, so every consumer of `summary.json` gains a case, and the
`overall_status` / `reviewers[].status` vocabularies drift apart. Rejected on principle: the defect
is a document, and widening a schema to match a documentation error is the wrong direction.

**Recommendation: A**, with B as an acceptable variant if the maintainer prefers one home for the
mapping. C should not be taken.

## Impact scope

- Shipped surface: `assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md` and its mirror.
  Inside the distributed surface.
- Production: none under A or B; `src/core/validators/reviewArtifacts.ts` under C.
- Specs: none. Ledger rows: none reset.
- Adopter-visible: yes — every adopter reads this file.

## Decision needed from user

Choose A, B or C.

## Approved actions (owner skill rerun plan)

1. Owner is the packaged skill text:
   `packages/qfai/assets/init/.qfai/assistant/skills/**/SKILL.md`, which tells adopters to write a
   review status its own reference, README and validator all reject. One-word fix in the packaged
   copy, propagated to `.qfai/` by reinstall. **No mode applies** — packaged skill text under `packages/qfai/assets/init/**`, outside the step-4 invocation table.
2. Downstream ledger sweep: **no rows are reset.** The packs written for spec-0006 followed the
   reference rather than this sentence, so no landed artifact carries the rejected value.
3. Cross-check after applying: grep the packaged tree for the rejected status literal and expect
   zero occurrences outside a passage that documents it as rejected.

## Resolution

the shipped SKILL.md now prescribes the value its 's own reference, README and validator accept

Pending.
