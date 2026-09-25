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

## Declare the P8 pack's producer

The pack this stage opens says which stage wrote it: `producer: "atdd"` in its
`summary.json`, and a `- Producer: atdd` line in its `review_request.md`, as
`../../qfai-implement/references/review-artifact-layout.md` requires of every
pack. A pack that declares no producer is placed by its `target.kind`, and
`spec` puts it under the SDD stage's gate, which then judges a pack it did not
open.

## Seal the P8 pack

When the last reviewer response lands, and **before this stage writes its
verdict**, hash the pack this stage opened — `.qfai/review/review-<timestamp>/`,
whole — by the stage-review audit-hash procedure
(`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-response-template`),
the one the section above applies to the evidence file. Only the subject
differs: there it is the evidence file, here the pack.

Record it **outside the pack** in the stage evidence file's `## Final status`:

```md
Review pack: `.qfai/review/review-<timestamp>/` <!-- qfai:not-a-citation .qfai/review/review-<timestamp>/ -->
Review pack seal: <sha256>
```

The path is the gate's operand and not a pointer: `.qfai/review/` is not
tracked, so a clone carries the record without the pack, and a reader who
follows the path finds nothing. The marker beside it says the path is not
provenance to open — the record's own verdict, revision and hash are.

Replace `<timestamp>` in the marker as well as in the path. A marker still
holding the placeholder is not read as a marker, so the pack path and the
placeholder's own prefix are both reported as citations of an untracked tree.

Name the run by its id, `review-<timestamp>`, everywhere else in the
record. The field is the one place the full path belongs, because the gate
resolves it under the repository root and recomputes the seal from what it
finds; a run named anywhere else as a path is a dead end for whoever reads
it next.

That section is the one part excluded from the P8 audit subject, so writing the
two fields there does not make the verdict stale. It is also the only slot that
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
