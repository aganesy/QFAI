# Evidence revision (what state the observation describes)

Four of the twelve gate items — 3, 5, 7 and 8 — are sub-agent observations, and
`#evidence-hard-rules` says stale evidence MUST NOT be reused. That rule needs
something to compare against. This file defines it.

## The field

Every observation records the revision it was made against.

```
Revision: <git rev> | working-tree+<porcelain digest>
```

- **`<git rev>`** — the output of `git rev-parse HEAD` at the moment of the
  observation. Preferred: it is exact and someone else can reproduce from it.
- **`working-tree+<porcelain digest>`** — for an uncommitted tree, the `HEAD`
  rev plus a short digest of `git status --porcelain`. Not as good, and honest
  about not being as good: it says "this observation was made against a state
  that was never committed".

It appears in three places, all carrying the same address:

1. **Reviewer responses** — as `Reviewed revision`, per
   `constitution/shared-skill-delegation-baseline.md#reviewer-response-template`.
2. **The per-item evidence contract** — one `Revision` per round block, beside
   the RED / GREEN commands and results, and one for the refactor-verify pair.
3. **The review pack** — `summary.json`'s `revision` field, which is what makes
   the fact machine-checkable (`QFAI-REVIEW-009`).

## Why an address, not a timestamp

A timestamp orders observations; it does not identify what was observed. Two
runs a second apart against different trees have different meanings and nearly
identical timestamps. The revision is the only thing that survives the question
"which code did this verdict actually rule on?".

Reviewers and `qa-gatekeeper` are dispatched against the **integrated** tree by
design — `constitution/workflow.md`'s worktree-separation rule constrains
implementers, not reviewers — so the tree a reviewer reads is legitimately
allowed to move under it. A fully independent reviewer reading a tree that is
being edited mid-review produces a verdict that is honest, independent and
unattributable. That is the failure this field exists for, and it is not fixed
by choosing a better reviewer.

## Blobs are derived — cite the revision, not the hash

A blob hash is **derived state**: `git rev-parse <rev>:<path>` determines it from the revision the
observation already names. Writing it into prose beside the revision duplicates information the
revision fixes, and a duplicate can diverge from its source.

**Do not enumerate blob hashes in per-item prose.** Record the `Revision`; where a specific file's
state matters, name the file and let the revision determine it — the reader runs
`git rev-parse <rev>:<path>`.

Why this is not fussiness. When several items share a test file or a production module — which is
normal, because one `TC-*` split across items lands in one file — every commit touching that file
changes the blob for **every item that cites it**, including items the commit has nothing to do with.
So a written blob goes stale for reasons belonging to a sibling; an item's own landing commit re-stales
its siblings' citations; and a repair to one item's record re-stales the others'. The count of stale
citations then grows with the number of commits rather than with the number of real defects, and each
repair writes more claims of the same kind. A revision has none of that behaviour: it is an address,
and addresses do not drift.

**The one exception, because no revision determines it: a _mutant_ blob.** A mutation is written to the
working tree and never committed, so there is no object to derive. Record a mutant as **base revision +
literal needle text + literal replacement text** — that is what makes it reproducible — and keep its
`git hash-object` value if you took one. The base half still follows the rule above: name the revision,
not the base blob.

## What makes evidence stale

Mechanically, so it can be checked rather than judged:

> Evidence is **stale** when the revision it names differs from the revision the
> item's work finally landed at.

Consequences:

- An item's four verdicts (gate items 3, 5, 7, 8) MUST all name the **same**
  revision. Verdicts from different revisions do not compose into a ruling about
  one state — the earlier ones ruled on code that no longer exists.
- A commit that changes any file the observation covered invalidates it. Re-run
  the observation; do not carry the verdict forward because "the change was
  unrelated". Whether it was unrelated is exactly the judgement the evidence
  exists to remove.
- **Read that bullet by what it says: _any file the observation covered_.** A commit that changes only
  the record — this evidence file, the ledger's `Status` / `DR-ID` / `Evidence` cells — covers no file
  any observation ran against, so it does not stale one. This is what allows an item's anchors to be
  written in the same commit that closes it, which is the only ordering under which several items
  sharing a file can all be current at once. Measure at the tip, then commit the record and the
  `done` transition together.
- A reviewer that noticed the tree moving mid-review says so and pins its ruling
  to a named revision. A pinned ruling is a valid verdict for **that** revision
  and a stale one for any later revision.

## When the tree moved under a reviewer

State it, in the response, with the revision. Two forms are acceptable:

- **Pinned** — the ruling stands for the named revision. The orchestrator then
  decides whether that revision is still the item's final state; if it is not,
  the review is re-run rather than reinterpreted.
- **Aborted** — the reviewer could not obtain a coherent read at all (for
  example, a suite whose collected count changed between two runs of the same
  command). That is `REVISE` with the reason, not `PASS` with a caveat: a
  mandated back-to-back identical run that could not be produced is a gate that
  did not pass.
