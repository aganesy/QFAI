# Pre-split evidence marker pass (one-time, per repository)

Gate item 10 sends an `E2E` / `API` / `Integration` row's evidence to the file
its `Layer` owns — `.qfai/evidence/atdd-<spec-id>.md`. Before that split every
row wrote to `.qfai/evidence/implement-<spec-id>.md`, and a row that predates it
still carries an anchor there. Item 10 accepts such an anchor only from a row
that says so: `Pre-split-evidence: implement` in its `Evidence` cell. This file
defines the pass that writes that marker. `Phase: Stage 0 + Preflight` step 3 is
the only thing that runs it.

## Why the gate does not write it

Item 10 is evaluated once per row, on every transition to `done`. The marker, by
contrast, is decided from history that does not move: whether the row's
`Evidence` anchor named the implement file in the commit that last advanced it,
and whether that commit predates the split. Written into the gate, a one-time
repository-wide migration — `git log -p` over the whole ledger, per row — was
re-read on every completion check, and its stated trigger ("run it as part of
taking this version") named no phase, so nothing ever ran it. Unmarked legacy
rows are then reported rather than accepted forever: the safe direction, but a
permanent one, and the rows it holds can never finish.

So item 10 reads the marker, and this pass writes it.

## The guard

The pass runs **once per repository**, not once per session — and "once" is
keyed to the inputs its answer was derived from: the ledgers it actually read
and the boundary overrides it obeyed, not the checkout. Its record is
`migrations.preSplitEvidence` in `.qfai/state.json`:

```json
{
  "migrations": {
    "preSplitEvidence": {
      "ledgers": "<ledger fingerprint>",
      "boundaries": "<boundary fingerprint>"
    }
  }
}
```

`<ledger fingerprint>` addresses the ledgers this pass actually read and wrote,
taken from the **working tree** and recomputed after it has written its markers:
for every ledger it enumerated, `path + NUL + git hash-object <path>`, sorted by
path, joined with newlines, SHA-256 — the manifest form
`references/evidence-revision.md` already defines. **Not a commit-tree address
such as `git rev-parse HEAD:.qfai/specs`.** The markers are written to the
working tree and are usually not committed in the same breath, so a tree object
reads identically before and after the pass: discard those uncommitted edits
afterwards and the recorded fingerprint still matches while every legacy row has
lost its marker, and the guard then skips the pass forever. A working-tree
manifest also gives an untracked spec tree a real address instead of one
constant string for every state it can be in. It moves when any ledger moves and
it differs between branches that carry different ledgers, which is the whole
point of recording it.

`<boundary fingerprint>` addresses the operator overrides under
`migrations.preSplitEvidence.boundary` (defined below), in the same manifest
form over what they are rather than over files: `<layer> + NUL + <commit-ish>`
for every layer set there, sorted by layer, joined with newlines, SHA-256 — and
the SHA-256 of the empty string where none is set. **An override is an input to
this pass's verdict, so it belongs in the guard that decides whether to re-run
it.** An operator sets one exactly when the derived boundary was wrong or
underivable — that is what the refusals below send them to do — and against a
guard that addresses only the ledgers, adding or correcting one changes nothing
the guard compares: the ledgers hash the same, the pass skips on sight, and the
boundary supplied to fix a wrong verdict is never evaluated once. The rows the
superseded boundary mismarked or refused stay exactly as they are, and nothing
downstream re-examines them.

- **Flag set → skip.** Set means present **and** carrying both addresses as they
  recompute now — one `git hash-object` per ledger for the first, and no `git`
  at all for the second. Parse no row, walk no history; report the skip in one
  line and continue with the next Preflight obligation.
- **Flag absent → run the procedure below, then set the flag.** Absent covers
  either recorded address no longer matching — a branch switch, a pull, a merge,
  or a boundary override added, corrected or removed.
  `.qfai/state.json` is checkout-local, so a flag pinned to nothing but
  the checkout let the first branch processed decide for all of them: migrate a
  branch with no legacy row, record `done`, switch to a branch that has them,
  and this pass reads neither ledger nor history again while item 10 rejects
  those rows forever. Set the flag even when the pass marked nothing: "these
  ledgers have no legacy row" is the answer, and re-deriving it every session is
  exactly the cost that put the migration in a per-item gate in the first place.
  The one exception is a run that **refused** something — a layer whose boundary
  it could not resolve, or a row whose last advance it could not date or could
  not date to one answer. That run reached no answer for what it refused, so it
  records none — **neither address**: a fingerprint taken over the working tree
  would still match once the ledger is committed or the history restored, and
  the pass would skip forever with those rows unmarked.
- Write the flag with the same create-or-merge rule as every other key in that
  file: preserve unrelated top-level keys, never rewrite the file wholesale.
- **A re-run is cheap by construction.** Step 1 below filters to the rows that
  can still need a marker before any `git` command runs, and in a migrated
  ledger that set is empty — a fingerprint change costs a ledger read, not a
  history walk.
- `.qfai/state.json` is per-checkout and not committed, so a fresh clone runs
  the pass again. That is harmless rather than a second migration: the procedure
  is idempotent — a row that already carries the marker is left alone — and it
  re-derives the same answer from the same history.

## Which ledgers: every one in the repository

Enumerate **every** `.qfai/specs/*/tdd/test-list.md` in the repository. Not the
selected spec's ledger: `/qfai-implement` processes one spec per invocation, but
this pass and its record are repository-wide, so migrating only the spec in hand
and then recording the fingerprint strands every other spec's legacy rows behind
a flag that says the migration is done — and item 10 refuses those rows on every
attempt after that.

## The procedure

**Write it once, from the history**, for **every** `E2E` / `API` / `Integration`
row past `todo` in every one of those ledgers — `red` and `green` and `refactor`
as much as `done` and `review-fix`. A row interrupted mid-cycle by the upgrade
has legitimately stored evidence in the implement file too, and skipping it
leaves that row unable to finish: unmarked, it is judged by the current rule
whatever its status, so the evidence it lawfully wrote is rejected at item 10.

For each such row:

1. **Filter before touching git.** A row already carrying
   `Pre-split-evidence: implement`, and a row whose `Evidence` anchor names
   `atdd-<spec-id>.md`, are settled — skip them. Only an unmarked row whose
   anchor names `implement-<spec-id>.md` needs history read for it.
2. **Reject an uncommitted advance before any history is read.** Compare the row
   as it stands in the working tree with the same row in `HEAD`
   (`git show HEAD:<test-list.md>`). If its `Layer`, `Status` or `Evidence`
   anchor differs there, the row was advanced after the last commit and no
   history can date that advance: `git log -p` sees only committed state, so it
   settles on the **previous** advance, and where that one predates the split a
   row moved forward today is marked as legacy. **Refuse the marker for that
   row** — report it in one line (the row, and that its advance is uncommitted)
   and record no fingerprint for the run. Committing the ledger and re-running
   is the way out.
3. Find the commit that **last advanced** the row from the row's **patch
   history**, not with `git log -S`. The id is on both sides of a status-only
   change, and `-S` matches a filepair only when one side contains the string,
   so it walks back to the commit that _added_ the row instead. Use
   `git log -p -- <test-list.md>`, newest first, as the candidate list
   (`git log -L` on the row narrows it where the line number is stable). Call
   the commit it settles on `A`.
4. **Take "advanced" semantically, not as "the line moved".** For each candidate,
   read the row's `Layer` and `Status` cells and its `Evidence` anchor at that
   commit and at its parent — `git show <sha>:<test-list.md>` against
   `git show <sha>^:<test-list.md>` — and take the newest commit where **any of
   them changed**. A commit that reflowed the table, re-wrapped a cell, fixed a
   typo in the row's prose or edited another column is not an advance: taken as
   `A`, it dates a legacy row's last advance to a post-split formatting commit,
   the boundary test below then reads that row as post-split, and a row that has
   lawfully held its implement anchor since before the split is refused the
   marker and stays ungateable — the failure this pass exists to remove.
   - **`Layer` counts, because it moves who owns the evidence.** A post-split
     commit that retypes a `Unit` or `Component` row to `E2E` / `API` /
     `Integration` and leaves `Status` and the anchor alone has advanced the row
     into ATDD ownership. Watching only `Status` and the anchor skips it, the
     walk settles on an older — possibly pre-split — status update, and the
     marker lands on a row that is ATDD-owned today and has never produced a
     handoff. Derive the boundary for the layer the row carries **now**, not the
     one it carried at `A`.
   - **A merge commit is not an advance in itself.** Comparing a merge with its
     first parent shows everything the merged branch did, so a row completed on
     a legacy branch before the split looks as if the merge advanced it — and
     the merge is newer than the boundary even though the work is not, which
     refuses the marker to a row that lawfully earned it and leaves it
     permanently ungateable. At a merge candidate, read the row at **every**
     parent (`git show <sha>^1:<test-list.md>`, `<sha>^2:…`, …): if any parent
     already carries the merge's values, the merge only took the change in —
     drop it and continue the walk into the history of **every** parent that
     carries them, for the commit that actually set them. Only when **no**
     parent carries them (a conflict resolution that edited the row itself) is
     the merge the advance.
   - **More than one parent can carry them, and then the verdicts must agree.**
     Two branches can advance the same row to an identical `Layer`, `Status` and
     anchor — one before the split, the other after it and written to the wrong
     file — and the merge that joined them leaves both parents holding the
     merge's values. Continuing into "that parent" picks one of the two by
     nothing but enumeration order, so the same repository and the same history
     can mark the row or refuse it depending on which side was read first, and
     the pre-split side marks a row whose other lineage never produced an ATDD
     handoff. Take **each** matching parent's own `A` through the boundary test
     below and act only on a **unanimous** verdict: every lineage pre-split →
     mark; every lineage post-split → no marker. **Verdicts that disagree →
     refuse the marker for that row**, report the row and both lineages, and
     record no fingerprint — the same fail-closed direction an undatable advance
     takes. One lineage saying "legacy" is not evidence of age while another
     says the row was advanced after its layer's split.
5. **No `A` → refuse, do not mark.** An untracked spec tree, a ledger not yet
   committed, a row whose line has never been committed, or a history too
   shallow to hold its advance all leave the walk with no candidate. That is not
   evidence of age: refuse the marker for that row, report it with the reason,
   and record no fingerprint — the same fail-closed direction an unprovable
   boundary takes. Marking here would burn the current working-tree fingerprint
   into the flag; committing the very same ledger afterwards leaves each blob
   hash unchanged, so the pass would skip forever and the legacy rows it never
   dated could never be marked.
6. Read the row's `Evidence` anchor **as of `A`**. It named
   `atdd-<spec-id>.md` → the row was advanced after the split; it gets no
   marker.
7. It named `implement-<spec-id>.md` → check **when** as well as where, against
   the boundary below. `A` before the boundary → append
   `Pre-split-evidence: implement` to the row's `Evidence` cell. `A` at or after
   it → no marker; that row wrote to the wrong file after the split, and the
   marker is not the fix for it.
8. Leave `Status`, `DR-ID` and the anchor itself untouched. The marker is the
   only thing this pass writes.

## The split boundary, per layer

The anchor at `A` is not enough on its own. A row advanced **after** the split
whose evidence was written to the implement file in error carries the same
implement anchor a legacy row does, and marking it would hand item 10's
acceptance to the one case the marker exists to keep out: a row that never
produced an ATDD handoff. So the pass verifies when the row was last advanced,
not only where its evidence pointed.

The layers moved at different releases — `E2E` and `API` first, `Integration` in
the release after — so the boundary is per layer. Derive it from the vendored
skill tree the repository commits. For a row whose `Layer` is `L`, the boundary
`B(L)` is the **oldest** commit whose
`.qfai/assistant/skills/qfai-implement/references/execution-ledger.md` already
routes `L` to `atdd-<spec-id>.md` (its `Evidence` column names `L` in that
list):

```bash
git log --reverse --format=%H -- \
  .qfai/assistant/skills/qfai-implement/references/execution-ledger.md
# oldest first, take the first <sha> whose copy routes L to the ATDD file:
git show <sha>:.qfai/assistant/skills/qfai-implement/references/execution-ledger.md
```

An operator can name the boundary instead: `migrations.preSplitEvidence.boundary`
in `.qfai/state.json`, keyed by layer, holding any commit-ish. Where it is set
for `L`, that is `B(L)` and no derivation runs. **Setting, correcting or
removing one re-runs this pass**, because the guard above addresses that map
alongside the ledgers — an override exists to overturn a verdict, and a guard
blind to it would skip the run that would apply the new boundary.

Then, with `A` from step 4 — once per lineage, where step 4 produced more than
one:

- `git merge-base --is-ancestor <A> <B(L)>` succeeds → `A` predates the oldest
  commit in this history that routes `L` to the ATDD file, so no contract it
  could have been written under routed it there. Pre-split, and step 7's anchor
  test decides. **This is the only case ancestry settles by itself**, and it has
  to be: a row older than the vendored skill tree has no `execution-ledger.md`
  to read at `A` at all, and requiring one would refuse the marker to the oldest
  legacy rows of all.
- `git merge-base --is-ancestor <B(L)> <A>` succeeds → the split had reached
  this repository by `A`, **which is not the same as its having been in force
  when the row advanced**. Decide from the contract as of `A`, below.
- **Neither succeeds → `A` and `B(L)` have diverged; do not read that as
  "before".** Once several branches have updated the assistant tree and been
  merged, `B(L)` and `A` can be siblings, and the first test's failure then says
  only "not an ancestor". Taken as pre-split it marks a post-split `A`, and item
  10 accepts an implement anchor from a row that never produced an ATDD handoff.
  Decide from the contract `A` itself was written under instead, below.
- **`B(L)` cannot be resolved → mark nothing for that layer.** The skill tree is
  untracked, or the clone is too shallow to hold the commit that introduced the
  split. **Fail closed**: an unproven boundary is not evidence that every row
  predates it, and reading it that way marks the post-split row written to the
  wrong file — handing item 10's acceptance to a row that never produced an ATDD
  handoff, which nothing downstream re-examines. Refusing the marker leaves such
  rows reported and re-markable the moment the boundary is available; granting
  it wrongly is not recoverable. Report the refusal in one line — the layer, why
  (untracked / shallow), and the two ways out: restore the history
  (`git fetch --unshallow`, or commit the vendored `.qfai/` tree) or set
  `migrations.preSplitEvidence.boundary.<layer>` above.
- **A run that refused a layer records no fingerprint**, and neither does one
  that refused a row — an uncommitted advance (step 2), an undatable one (step
  5), or a merge whose lineages disagreed (step 4) — so the next Preflight tries
  again once the history is there. That re-run costs one ledger read per spec
  plus the boundary derivation — step 1 filters every settled row out before any
  per-row history is walked.

**The contract as of `A` decides the second and third cases above.**
`git show <A>:.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`
— it routes `L` to `atdd-<spec-id>.md` → `A` is post-split, no marker; it routes
`L` to the implement file → pre-split, and step 7 decides; the file is absent or
unreadable at `A` → the boundary is unproven for that row, so refuse the marker
and record no fingerprint, exactly as an unresolvable `B(L)` does. **Descending
from `B(L)` is not proof that the split was in force at `A`**: roll the vendored
`.qfai/` tree back to a pre-split copy — a revert, a bad merge, a downgrade to
pin a working version — advance the row under that older contract, then upgrade
again, and `A` sits after `B(L)` in the graph while the ledger it actually obeyed
still sent `L` to the implement file. Read as post-split, that row is refused the
marker its lawful evidence needs, item 10 demands an ATDD anchor it has no entry
for on every attempt, and a `done` row has no transition left that could produce
one — the permanent failure this whole pass exists to remove. `B(L)` says where
to start looking; only the contract at `A` says what the row was written under.

Resolve `B(L)` once per layer per run and cache it: it is at most three walks of
one file's history, never one per row.

## `Integration` is in scope, and it is the newest legacy case

`Integration` joined the ATDD file one release **after** `E2E` and `API`. Before
that, an ordinary Integration row stored its evidence in
`implement-<spec-id>.md` like every other row this skill drove, so a repository
upgrading across that release has Integration rows already `done`, `review-fix`
or mid-cycle whose anchors point there lawfully. Excluding them would leave them
exactly where the marker exists to prevent: item 10 demands an ATDD anchor they
have no lawful entry for, and a `done` row has no transition that would let it
produce one. They take the same history test as `E2E` / `API`, against their own
later `B(Integration)`.

## What the marker does not license

Status and anchor alone cannot tell a legacy row from a new `E2E` / `API` /
`Integration` row written to the wrong file — which is why item 10 refuses an
implement anchor that carries no marker, and why this pass reads history rather
than status. Marking a row whose last advance already pointed at the ATDD file,
or whose last advance came after its layer's split, would let a row that never
produced its ATDD handoff be accepted as complete, which is the one thing the
marker exists to keep out.
