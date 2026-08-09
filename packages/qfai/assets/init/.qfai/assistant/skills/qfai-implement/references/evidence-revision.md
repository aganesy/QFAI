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
  `git rev-parse HEAD`, `git diff HEAD` and the contents of every untracked
  file. Not as good as a rev, and honest about not being as good: it says "this
  observation was made against a state that was never committed".

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
- **One exception, and it is structural: a RED `/qfai-atdd` handed over.** That
  RED is taken before the production code exists, so its revision is earlier
  than the GREEN's by construction — that is the property it is worth having,
  not decay. Such a row records it as `RED revision` (its own field, beside the
  RED pair) and leaves `Revision` for the GREEN and the two reviews, which must
  still agree with each other. Folding both into one field made a correct
  `observed-red` E2E/API row permanently stale and unable to reach `done`.
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
