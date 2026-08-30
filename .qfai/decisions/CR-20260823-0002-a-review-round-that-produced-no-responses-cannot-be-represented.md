# Change Request

- ID: `CR-20260823-0002`
- Title: `A review round that produced no responses cannot be represented, and the validator calls the accurate record an error`
- Raised by: `/qfai-atdd orchestrator, spec-0017; found by a pre-PR audit of feature/chg-007-layered-ci-scaffold`
- Raised at: `2026-08-23T00:30:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `1` — let a summary.json declare zero reviewers
- Applied at: `2026-08-23T00:00:00Z` — validator + 4 cases; the abandoned round now carries a summary declaring reviewers: []
- Superseded by: `-`
- Blocked set: `-`

## The state that cannot be written down

`.qfai/review/review-20260821200000000/` is `spec-0017`'s round 13. Its three reviewers died on
`ENOTFOUND` before writing anything, so the pack holds a `review_request.md` and nothing else. That is
not an incomplete record — **it is the accurate one**: a round was opened and produced no responses.

`.qfai/evidence/atdd-spec-0017.md` states the position in its own words: _"Zero is a legitimate response
count for a round; it is not a passed one."_ The validator disagrees, in three places, and all three are
`error`:

```text
packages/qfai/src/core/validators/reviewArtifacts.ts
  252  QFAI-REVIEW-004  review pack に `summary.json` がありません。          error
  265  QFAI-REVIEW-005  review pack に `Rxx_*.md` が1件もありません。          error
  567  (schema)         `reviewers` は1件以上の配列が必須です                  error via QFAI-REVIEW-007
```

The third is what makes the state genuinely unwritable. `-004` could be cleared by writing a
`summary.json`, and `-005` by inventing a reviewer file — but a `summary.json` carrying
`reviewers: []`, which is the true content, fails the schema, and inventing a reviewer file records a
response that nobody gave. **Every available action is either an error or a lie.**

`legacyPacks` does not reach it: that exemption is consulted only inside `validateSummarySchema`, which
runs only when `summary.json` exists.

## Why it matters beyond one directory

`validateReviewArtifacts` runs unconditionally in `runFullValidators`, and `.github/workflows/ci.yml`
runs `validate --profile full --fail-on error` as part of the required `build` context. Today the job
fails earlier, on `QFAI-ATDD-112` under the `tdd` profile, so this never executes — **it is a blocker
waiting behind another blocker.** When the change requests holding `QFAI-ATDD-112` are decided, this
becomes the next thing that stops the branch.

It also ships: any adopter whose review round is abandoned — a killed agent, a lost session, a
cancelled round — inherits two permanent `error` findings for having recorded the truth.

## Options

1. **Let a `summary.json` declare zero reviewers.** Drop the non-empty constraint, and skip
   `QFAI-REVIEW-005` when a schema-valid summary declares `reviewers: []`. The pack then says
   explicitly "this round produced nothing", which is checkable and cannot be confused with a pack
   somebody forgot to seal. Smallest change; needs the summary to be present, which is the part that
   makes it a deliberate statement rather than an absence.
2. **Add an explicit `overall_status` of `ABANDONED`** (or `status: "abandoned"`) and gate `-004`/`-005`
   on it. More expressive, and it separates "produced nothing" from "produced nothing yet". Larger
   surface: the enum is read in more than one place, and `PASS|FAIL` is currently total.
3. **Demote `-005` to `warning` when `review_request.md` exists.** Cheapest. Loses the guarantee for
   the common case, where a pack genuinely missing its reports is a real defect.
4. **Do nothing; delete abandoned packs instead.** Keeps the validator, and erases the fact. It also
   moves every derived count in this stage's record, because the pack total is read from disk.

Recommendation: **1**. It is the smallest rule that makes the true state expressible, it keeps the
guarantee for packs that are simply unsealed, and the required `summary.json` is what turns an
abandoned round from an absence into a statement.

## Not this stage's to take

`spec-0017` owns a CI scaffold and its acceptance tests. Review-artifact validation is another
surface, the change is to a shipped validator's semantics, and the option chosen determines what every
adopter's abandoned round looks like. Filed rather than fixed.
