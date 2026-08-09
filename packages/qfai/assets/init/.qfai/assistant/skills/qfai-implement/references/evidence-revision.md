# Evidence revision (what state the observation describes)

Four of the twelve gate items — 3, 5, 7 and 8 — are sub-agent observations, and
`#evidence-hard-rules` says stale evidence MUST NOT be reused. That rule needs
something to compare against. This file defines it.

## The field

Every observation records the revision it was made against.

```
Revision: <git rev> | working-tree+<content hash>
```

- **`<git rev>`** — the output of `git rev-parse HEAD` at the moment of the
  observation. Preferred: it is exact and someone else can reproduce from it.
- **`working-tree+<content hash>`** — for an uncommitted tree, a hash over
  `git rev-parse HEAD`, `git diff HEAD` and a **manifest** of every untracked
  file: its path, a NUL byte, and the hash of its contents, sorted by path. Path,
  boundary and order all have to be in it. Contents alone collide — renaming a
  file, or swapping the contents of two, leaves the hash unchanged — and with no
  defined order or separator a second reviewer cannot recompute the same value
  for the same tree, which is the one thing this address exists to allow. Not as good as a rev, and honest about not being as good: it says "this
  observation was made against a state that was never committed".

  **The ledger is excluded from it.** Phase Green step 3 writes `green` and
  Refactor step 3 writes `refactor` into `test-list.md` between the
  observations, and gate item 10 requires the GREEN and the two reviews to name
  the **same** revision — so a hash over the whole of `git diff HEAD` moved on
  its own bookkeeping and no uncommitted item could reach `done`. Compute it
  over the tree **minus `.qfai/specs/*/tdd/test-list.md` and `.qfai/evidence/**`\*\*:
  those are the record of the observation, not the thing observed. Everything the
  observation is about — production code, tests, fixtures — stays in.

  **What that exclusion costs, and the address that pays it back.** Leaving
  `.qfai/evidence/**` out keeps the revision stable across the phase's own
  writes, but it also puts the RED/GREEN output the reviewers audit — and the
  committed `.qfai/evidence/coverage-depth-<spec-id>.md` whose per-`❌`
  justifications they accept — outside every address the gate checks: edited
  after a PASS they leave `Reviewed revision` unchanged, and gate item 10 reads
  the old verdict as fresh. Each reviewer therefore records an **`Audited
evidence hash`** beside its `Reviewed revision`, over the row's
  **phase-authored** entry — the entry with the reviewer-appended fields
  (`Spec review`, `Code quality review`, `Prototype parity`) removed, which is
  exactly what the reviewer read — plus `coverage-depth-<spec-id>.md` where the
  row has one. Same manifest form as `RED test hash` (`path + NUL + blob hash`,
  sorted by path), so the boundary is the same for the reviewer and for whoever
  recomputes it. Gate item 10 recomputes it; a mismatch means the audited
  evidence moved after the verdict, and the verdict is not fresh.

  **A `git status --porcelain` digest is not sufficient**, which is what this
  field used to specify. Porcelain names the changed paths and their states, so
  editing the very file under test after the RED leaves it identical and a stale
  observation passes the freshness check this field exists for — and a new
  acceptance test, the ordinary case, is untracked, so its content has to be in
  the hash explicitly. `git stash create` does not do it either: it has no
  `-u`, and the tree it builds omits untracked files.

It appears in three places, all carrying the same address:

1. **Reviewer responses** — as `Reviewed revision`, per
   `constitution/shared-skill-delegation-baseline.md#reviewer-response-template`.
2. **The per-item evidence contract** — one `Revision` per round block, beside
   the RED / GREEN commands and results, and one for the refactor-verify pair.
3. **The review pack** — `summary.json`'s `revision` field, which is what makes
   the fact machine-checkable (`QFAI-REVIEW-009`).

## A transient observation names its own revision

Two exist, and neither can be taken against the tree the reviewers judge: a RED
`/qfai-atdd` handed over precedes the production code (`RED revision`), and a
`falsifiability` row's mutation run is taken against a tree that is reverted
before the GREEN (`Falsifiability revision`). Both are exempt from the
same-revision rule, because the property that makes them worth having is that
they were taken somewhere else — a mutation run against the final tree would
prove nothing, since the mutation is not in it. The remaining observations still
agree with each other.

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

## What makes evidence stale

Mechanically, so it can be checked rather than judged:

> Evidence is **stale** when the revision it names differs from the revision the
> item's work finally landed at.

Consequences:

- An item's four verdicts (gate items 3, 5, 7, 8) MUST all name the **same**
  revision. Verdicts from different revisions do not compose into a ruling about
  one state — the earlier ones ruled on code that no longer exists.
- **Two exceptions, both structural, both above under _A transient
  observation names its own revision_.** A RED `/qfai-atdd` handed over is
  taken before the production code exists, so its revision is earlier than the
  GREEN's by construction; a `falsifiability` row's mutation run is taken
  against a tree that is reverted before the GREEN, so its revision names a tree
  that no longer exists. In both, that is the property the observation is worth
  having, not decay. Each records its own field — `RED revision` beside the RED
  pair, `Falsifiability revision` beside the trio — and leaves `Revision` for
  the GREEN and the two reviews, which must still agree with each other. Folding
  either into `Revision` made a correct row permanently stale and unable to
  reach `done`: the `observed-red` E2E/API rows first, and every branch-2 row
  once the gate began reading the mutated tree.
  Everything else about staleness is unchanged: `RED revision` is judged
  against the tree the RED was observed on, and a later commit touching the
  test itself invalidates it the same way.
- A commit that changes any file the observation covered invalidates it. Re-run
  the observation; do not carry the verdict forward because "the change was
  unrelated". Whether it was unrelated is exactly the judgement the evidence
  exists to remove.
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
