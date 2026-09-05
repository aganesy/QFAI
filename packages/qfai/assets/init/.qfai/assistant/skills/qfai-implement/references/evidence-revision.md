# Evidence revision (what state the observation describes)

Four of the twelve gate items — 3, 5, 7 and 8 — are sub-agent observations, and
item 6 re-confirms GREEN after the refactor; `../SKILL.md#evidence-hard-rules`
says stale evidence MUST NOT be reused. That rule needs something to compare
against. This file defines it. Which of the five addresses which tree is the
table under _Which tree each gate item addresses_, which carries item 12's
checkpoint address as well.

## The field

Every observation records the revision it was made against.

```
Revision: <git rev> | working-tree+<content hash>
```

**The form is checked, in the committed evidence.** A value that is neither a
git rev nor `working-tree+<content hash>` addresses no tree, so nothing can be
recomputed against it and staleness has nothing to compare — and the review pack
is local-only, so on a fresh clone the committed entry is the only thing left to
check. Gate item 10 rejects any other shape wherever a revision is recorded:
`Revision`, `RED revision`, `Falsifiability revision` and both
`reviewed revision` fields.

- **`<git rev>`** — the output of `git rev-parse HEAD` at the moment of the
  observation. Preferred: it is exact and someone else can reproduce from it.
- **`working-tree+<content hash>`** — for an uncommitted tree. Not as good as
  a rev, and honest about not being as good: it says "this observation was made
  against a state that was never committed".

  **The procedure, exactly.** "A hash over HEAD, the diff and the untracked
  files" is not one value: producer and reviewer can each pick a defensible
  separator, diff option or record shape and get different answers for the same
  tree, and then an ordinary uncommitted item is stale for nobody's mistake.
  Four steps, the same shape as `Audited evidence hash`:
  1. **Collect.** `git rev-parse HEAD`; the tracked diff from
     `git diff HEAD --no-color --no-ext-diff --binary --` followed by the
     exclusions below; and every untracked file
     `git ls-files --others --exclude-standard` reports, after the same
     exclusions.
  2. **Exclude.** `.qfai/specs/*/tdd/test-list.md`, `.qfai/evidence/**` and
     `.qfai/review/**`, from **both** the diff and the untracked list — they are
     the record of the observation, not the thing observed. The review pack is
     on that list for the same reason the others are: a project may legitimately
     track `.qfai/review/**`, and then every reviewer answer written into it
     moved the address the previous reviewer had just recorded, so items 7-8
     could not agree on one revision and a correct item never reached `done`.
     What protects the pack is a **pack seal**, not the audit hash: that one
     addresses the evidence a reviewer _read_, and the pack is what it _wrote_.
     When the last reviewer of a round has stored its response, record the seal
     in the item's evidence entry as `Review pack seal` — by the **audit-hash**
     procedure in
     `../../../constitution/shared-skill-delegation-baseline.md#reviewer-response-template`,
     not the working-tree one below: its step 2 normalization (LF, trailing
     whitespace, leading and trailing blank lines, one final newline), its
     `path + NUL + SHA-256` record sorted by path, its final hash over the
     joined records. The subject is every file in that `review-<timestamp>/`
     directory, each under its repo-relative path. "The procedure below" was
     ambiguous between the two, and the two produce different values. It is
     recorded **outside** the pack, so nothing in the pack hashes itself, and
     **gate item 10 recomputes it from the pack** and compares — that is the
     check, and without it the field was a value nobody read. It is **not** in
     any reviewer's audit subject: the seal is written after the last reviewer
     has hashed, so putting it there would make that verdict stale on being
     recorded. Editing `Result`, `Reviewed revision` or `overall_status`
     afterwards therefore moves the recomputation rather than the stored value,
     which is what a seal is for. Excluding the pack from the revision without this left an
     edited PASS reading as fresh.

     **Record it per round, and name the pack it seals**: `Round N: Review pack`
     (the `review-<timestamp>/` directory) and `Round N: Review pack seal`
     beside it. A spec has several packs and a blocking REVISE opens more, so a
     bare hash left the gate unable to say which directory to recompute over —
     it either checked another round's pack or stopped a correct item.

     **A record re-attestation seals its own pack the same way**, under
     `Record re-attestation pack` and `Record re-attestation pack seal` — it is
     not a round, so it takes no `Round N:` prefix
     (`../../../constitution/drift-protocol.md#the-record-defect-queue`). The
     pack holding the verdict it supersedes is never edited to restamp a hash:
     that would break the seal already recorded over it, which is the one thing
     a seal exists to prevent.

     **What a seal does and does not catch — say it once, plainly.** It is
     recorded at one moment and recomputed at another, and it catches every
     change between them: a pack edited after the round closed, a checkpoint
     result edited after a row reached `done`, a stage evidence file edited
     after the verdict. That is drift, and drift is what actually happens.

     It does **not** catch an author who rewrites the sealed artifact and the
     seal together in one consistent pass. Nothing recorded in the repository
     can: the expected value has to live somewhere, and wherever that is, the
     same hand can update it. Three successive homes were tried and each fell to
     the same move — beside the artifact, in a commit, in the newest commit that
     introduces the line — and a fourth would fall too. **Committing the seal is
     not the answer either.** Per-item stage evidence is a committed governance
     record (the managed `.gitignore` block negates `implement-*.md` and
     `atdd-*.md` back in), but the record and its seal are still writable by the
     same authority.

     A consistent rewrite is caught where consistent rewrites are caught: by
     review of the change itself, against a history the seals make legible.
     Recording it is what makes an inconsistent one impossible to miss; do not
     read it as more than that, and do not add a fourth mechanism.

  3. **Serialize.** `HEAD` + NUL + the rev; then `DIFF` + NUL + the SHA-256 of
     the diff bytes; then one record per untracked file,
     `path + NUL + kind + NUL + mode + NUL + the SHA-256 of its bytes`, sorted
     by path in byte order. `kind` is `file` / `symlink` / `dir` and `mode` is
     the octal permission bits. **On a `symlink` the bytes are the link's own
     payload** — what `readlink` returns — never the target's contents: the two
     are both defensible readings, so producer and reviewer could compute
     different addresses for one tree, and a dangling link has no second reading
     at all. On a `dir` the hash is over the empty string; the entries under it
     are records of their own. The point of `mode`: a tracked diff carries a mode change, and
     without these an uncommitted `chmod +x` on a new script left the address
     unmoved — same bytes, different behaviour under test, CI and packaging,
     with a reviewer PASS taken before it still reading as fresh.
     Join the records with
     `\n`. Path, boundary and order are all in it on purpose: contents alone
     collide — renaming a file, or swapping the contents of two, leaves the hash
     unchanged.
  4. **Hash.** SHA-256 of that string; record the hex digest.

  An empty diff and an empty untracked list still contribute their records, so
  "clean but uncommitted" has a value rather than a special case.

  **The ledger is excluded from it.** Phase Green step 3 writes `green` and
  Refactor step 3 writes `refactor` into `test-list.md` between the
  observations, and gate item 10 requires the refactor-verify run and the two
  reviews to name the **same** revision — so a hash over the whole of
  `git diff HEAD` moved on its own bookkeeping and no uncommitted item could
  reach `done`. Compute it
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
evidence hash`** beside its `Reviewed revision`. **What it covers is the
  named subject for that observation** — RED, GREEN or completion review —
  defined once in
  `../../../constitution/shared-skill-delegation-baseline.md#reviewer-response-template`.
  Do not restate it here and do not derive it by subtraction: an entry that goes
  on growing means "the section minus what is written later" is a different
  value for every reader, and each observation is judged against the fields that
  existed when it was taken. Gate item 10 recomputes each verdict against its
  own subject; a mismatch means the audited evidence moved after the verdict,
  and the verdict is not fresh.

  **A `git status --porcelain` digest is not sufficient**, which is what this
  field used to specify. Porcelain names the changed paths and their states, so
  editing the very file under test after the RED leaves it identical and a stale
  observation passes the freshness check this field exists for — and a new
  acceptance test, the ordinary case, is untracked, so its content has to be in
  the hash explicitly. `git stash create` does not do it either: it has no
  `-u`, and the tree it builds omits untracked files.

It appears in three places. All three compute the address by the same procedure,
but **each names the tree its own observation was taken against**, and those are
not one tree: a round block's `Revision` names the pre-refactor tree, while
`Refactor verify revision` and the reviewers' `Reviewed revision` name the final
one — the table under _Which tree each gate item addresses_ says which is which.
Reading "the same address" into this list is what would make a producer overwrite
item 5's `Revision` with the final value, or pull a reviewer's back to the
pre-refactor one, and break that table or gate item 10. The three places:

1. **Reviewer responses** — as `Reviewed revision`, per
   `../../../constitution/shared-skill-delegation-baseline.md#reviewer-response-template`.
2. **The per-item evidence contract** — one `Revision` per round block, beside
   the RED / GREEN commands and results, one for the refactor-verify pair, named
   `Refactor verify revision` after the pair it sits beside, and one for the
   checkpoint pair, named `Checkpoint verification revision` the same way
   (`checkpoint-verification.md`). Which of these carry a `Round N:` prefix is
   `round-evidence.md`'s list and only that.
3. **The review pack** — `summary.json`'s `revision` field, which is what makes
   the fact machine-checkable (`QFAI-REVIEW-009`). Write
   `"revision_form": "content-hash"` beside it — **required**, not optional.
   That marker is how a pack says which contract produced it. Neither the pack's
   age nor its rank among siblings can stand in for it: a directory stamp
   carries no timezone, and "the newest pack" stops being the current one the
   moment another spec produces its own. Nor can the marker be optional — a
   producer that omitted it would downgrade its own check to a warning, which
   makes the strict form opt-in and lets a stale verdict through
   `--fail-on error`.

   **A pack written before the form says `"revision_form": "legacy"` _and is
   listed in `.qfai/review/.legacy-packs`_, and only that excuses a malformed
   `revision`** (reported as a warning instead of an
   error): the tree its verdict described is not reconstructible, so there is no
   content hash to migrate to. Write those markers **once, from the history** —
   `npx qfai doctor --autoremediate` does it: it records every pack already on
   disk that does not declare the form, additively and idempotently, so a repeat
   run is a no-op and a pack that forgets its marker _afterwards_ is not
   excused. The pack's own word is not enough on its
   own: it is exactly as writable as the `revision` it excuses, so a current
   producer with a broken value could downgrade its own finding by typing
   `legacy`. The manifest is one file a reviewer reads whole, and adding a pack
   to it later is a visible change to a migration record. Until that pass has run those packs are reported rather than
   accepted, which is the safe direction, and running it is what clears them.

## Which tree each gate item addresses

One table, so nothing has to be inferred from an exception list attached to a
different item. The **final tree** is the one the reviewers judge: the tree as it
stands after Phase: Refactor.

| Gate item                             | Field that carries the address                                                   | Tree it addresses                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 3 — RED observed                      | `Round N: RED revision`, or `Round N: Falsifiability revision` on a branch-2 row | before the production code that makes the test pass exists; for a mutation run, the mutated tree, reverted before the GREEN |
| 5 — GREEN observed                    | `Round N: Revision`                                                              | after implementation, **before** the refactor                                                                               |
| 6 — GREEN re-confirmed after refactor | `Refactor verify revision`, beside `Refactor verify command` / `result`          | the final tree                                                                                                              |
| 7 — `completion-reviewer` PASS        | `Reviewed revision` in the response                                              | the final tree                                                                                                              |
| 8 — `implementation-reviewer` PASS    | `Reviewed revision` in the response                                              | the final tree                                                                                                              |
| 12 — checkpoint verification passed   | `Checkpoint verification revision`, beside its `command` / `result`              | the tree the checkpoint's own command set ran on — the final tree, that boundary sitting after every reviewer PASS          |

**Items 6, 7 and 8 MUST name the same revision. Items 3 and 5 each name their
own**, and are exempt from that rule for the reason below.

**Item 12 takes its address from its own run.** The per-item boundary is reached
after items 7 and 8 have passed and before `refactor -> done`, so a checkpoint
that passes first time ran on the tree those three name — but that is the
ordinary case, not a guarantee, and the seal over the checkpoint record has to
say which tree the record describes. A checkpoint failure is fixed and the whole
set re-run (`checkpoint-verification.md#pass-criteria`), which moves the address;
the same fix re-earns the reviewer PASSes and refreshes the `Refactor verify`
triple, so the four move together rather than drifting apart. Borrowing a round
block's `Revision` for the seal would be worse than imprecise: that field
addresses the pre-refactor tree, so the seal would certify a run that was never
made there, and a producer trying to make the two agree would overwrite item 5's
address and break the row above. The spec-level boundary has no row and so no
round block to borrow from at all; it records the field the same way.

**On a T1 batched review, item 6 is re-taken when the group closes.** Members are
parked in `refactor` while the rest of the coherent group is implemented, so each
later member's change moves the tree under the ones already parked, and the
group's single pair of reviews reads the closed tree. The close therefore re-runs
every member's relevant suite on that tree and refreshes all three
`Refactor verify` fields before the reviews are requested
(`volume-policy.md#group-formation-states-and-transitions`). Without it the rule
above is unsatisfiable for every member but the last — not because batching
exempts anything, but because the address was taken too early.

**On a parallel run, item 6 and every review are re-taken after the merge.** A
worker takes them all inside its own worktree, and the merge adds every other
slice's change, so the address they share is not the integrated tree's. The
post-merge step re-runs each merged item's relevant suite, refreshes its
`Refactor verify` fields and re-requests the reviews — items 7 and 8 on every
item, and item 9's `product-surface-reviewer` review as well on a UI-affecting
one (prototype parity, or on a cli-only target the captured-output surface
review item 9 puts in its place), whose reviewed output another slice can change
while this item's own suite stays GREEN — before that item goes `done`
(`parallelization-policy.md#re-verify-each-merged-item-on-the-integrated-tree`).
"Before `done`" is literal: the orchestrator writes a worker's returned `done`
into the trunk as `refactor` and promotes it only after the re-take passes
(`parallelization-policy.md#ledger-ownership`), because the reconciliation write
runs first and `done` has no edge back to `refactor`.
Same cause as the T1 case: the observations were taken before the tree the item
ships on existed.

## A transient observation names its own revision

**Every RED is one.** A RED is observed before the code that makes it pass
exists — that is what a RED _is_ — so on an uncommitted tree Phase Green's write
moves the content address by construction, and requiring item 3 to name the same
`Revision` as the later observations made an ordinary `Unit` / `Component` /
`Integration` cycle stale the moment it went green. Framing the exemption as
two special cases was reading the handed-over RED and the falsifiability
mutation as exceptions to a rule they are instances of. **Item 3 records
`RED revision` on every row**; a `falsifiability` row records
`Falsifiability revision` in its place, because its observation is the mutation
run and that tree is reverted before the GREEN. Both are exempt from the
same-revision rule, because the property that makes them worth having is that
they were taken somewhere else — a mutation run against the final tree would
prove nothing, since the mutation is not in it.

**So is every GREEN, for the same reason one step later.** Item 5 is observed
after implementation and before Phase: Refactor; items 7 and 8 are requested from
`refactor` and never from `green` (`../SKILL.md`, Phase: Refactor step 4). A
refactor that changes one byte moves the content address by construction, so
requiring item 5 to agree with items 7 and 8 left that pair jointly satisfiable
only by a refactor that changed nothing — **only by not doing item 6**. Item 5
keeps its round block's `Revision`, which addresses the pre-refactor tree.
The observation of the tree the reviewers judge is item 6's, recorded as
`Refactor verify revision`, and that is the address items 7 and 8 agree with.
The remaining observations still agree with each other.

## Why an address, not a timestamp

A timestamp orders observations; it does not identify what was observed. Two
runs a second apart against different trees have different meanings and nearly
identical timestamps. The revision is the only thing that survives the question
"which code did this verdict actually rule on?".

Reviewers and `qa-gatekeeper` are dispatched against the **integrated** tree by
design — `../../../constitution/workflow.md`'s worktree-separation rule constrains
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

- An item's verdicts **on the final tree** — gate items 6, 7 and 8 — MUST all
  name the **same** revision. Verdicts from different revisions do not compose
  into a ruling about one state — the earlier ones ruled on code that no longer
  exists.
- **The exceptions are items 3 and 5, on every row, above under _A transient
  observation names its own revision_** and in the table under _Which tree each
  gate item addresses_. A RED is observed before the code that
  makes it pass exists, so on an uncommitted tree Phase Green moves the content
  address by construction — an ordinary `Unit` / `Component` / `Integration`
  cycle as much as a handed-over one. Listing two special cases here left a
  reviewer applying this section to reject the very cycle the section above
  permits. A RED `/qfai-atdd` handed over is
  taken before the production code exists, so its revision is earlier than the
  GREEN's by construction; a `falsifiability` row's mutation run is taken
  against a tree that is reverted before the GREEN, so its revision names a tree
  that no longer exists. A GREEN is observed before the refactor, so any refactor
  that changes a byte moves the address before items 7 and 8 are even requested.
  In all three, that is the property the observation is worth
  having, not decay. Each records its own field — `Round N: RED revision` beside
  the RED pair, `Round N: Falsifiability revision` beside the trio,
  `Round N: Revision` beside the
  GREEN pair — and leaves `Refactor verify revision` for item 6 and the two
  reviews, which must still agree with each other. Folding
  any of them into one field made a correct row permanently stale and unable to
  reach `done`: the `observed-red` E2E/API rows first, every branch-2 row
  once the gate began reading the mutated tree, and every row whose refactor
  actually changed something.
  Everything else about staleness is unchanged: `RED revision` is judged
  against the tree the RED was observed on, and a later commit touching the
  test itself invalidates it the same way.
- A commit that changes any file the observation covered invalidates it. Re-run
  the observation; do not carry the verdict forward because "the change was
  unrelated". Whether it was unrelated is exactly the judgement the evidence
  exists to remove.
- **Compute it as an interval, from the revision the observation NAMES to now**
  — not as "did anything change since my last commit?", which is a different
  and much weaker question:

  ```bash
  git diff --name-only <the revision this observation names>..HEAD -- src tests
  ```

  A non-empty result means re-take before submitting. The wrong baseline is the
  reading that produces a stale field, and it produces one that looks exactly
  like a fresh one.

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
