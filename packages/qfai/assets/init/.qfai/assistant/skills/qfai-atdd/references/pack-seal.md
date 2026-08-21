# Stage seal (P8 audit hash and review pack seal)

Two obligations the Definition of Done names in one line each, stated here
once. Both are checks on the P8 completion review: the first says the evidence
the reviewer read has not moved, the second says the pack the reviewer wrote has
not moved.

The seal itself — how it is computed, what it is over, why it is recorded
outside the artifact it seals, and what it does and does not catch — is
defined once for the whole tree in
`../../qfai-implement/references/evidence-revision.md#review-pack-seal`. Do not
restate it here; this file says what `/qfai-atdd` adds at stage level.

## Recompute the P8 audit hash before declaring completion

The P8 reviewer's `Audited evidence hash` is recomputed from the **current**
stage evidence file and Coverage Depth Matrix, by the stage-review procedure
that produced it
(`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`).
A mismatch means the evidence moved after the verdict, and the verdict is not
fresh — this stage does not declare completion on it.

## Seal the P8 pack

When the last reviewer response lands, and **before this stage writes its
verdict**, hash the pack this stage opened — `.qfai/review/review-<timestamp>/`,
whole — by the same procedure.

Record it **outside the pack** in the stage evidence file's `## Final status`:

```md
Review pack: `.qfai/review/review-<timestamp>/`
Review pack seal: <sha256>
```

That section is the one part excluded from the P8 audit subject, so writing the
two fields there does not stale the verdict. It is also the only slot that
exists on a spec with **no ATDD-owned rows**, where there is no item evidence
entry to hold the seal at all.

## Recompute the seal at completion, against the recorded value

At completion, recompute the seal over the **recorded** path and compare it with
the **recorded** value, then check that `## Final status` says what that pack
says.

The recording and the recomputation must be two moments. A value computed from
the pack at completion always matches itself, whatever was edited in between,
and the stage audit hash covers the evidence but not the verdict — so a
`REVISE` edited to `PASS` in the response, the summary and the status together
left every recomputation unchanged.

Reading the expected value from the working tree has the same defect: `## Final
status` is outside every audit subject and outside the working-tree revision, so
it could be rewritten in the same pass that edited the pack.

## Why the stage records it at all

On a spec with no ATDD-owned rows, `/qfai-implement`'s gate item 10 never runs.
Without this stage-level record the P8 hash was written by the reviewer and read
by nobody — and the evidence tree is out of the working-tree revision, so a
later edit moved nothing else either.
