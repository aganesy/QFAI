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
keyed to the ledgers it actually read, not to the checkout. Its record is
`migrations.preSplitEvidence` in `.qfai/state.json`:

```json
{ "migrations": { "preSplitEvidence": { "ledgers": "<fingerprint>" } } }
```

`<fingerprint>` addresses the tracked spec tree: `git rev-parse HEAD:.qfai/specs`,
or the string `untracked` where that resolves to nothing (no commit yet, or
`.qfai/specs` outside the index). It moves when any ledger moves and it differs
between branches that carry different ledgers, which is the whole point of
recording it.

- **Flag set → skip.** Set means present **and** carrying this checkout's
  current fingerprint. Read no ledger, walk no history; report the skip in one
  line and continue with the next Preflight obligation.
- **Flag absent → run the procedure below, then set the flag.** Absent covers a
  recorded fingerprint that no longer matches — a branch switch, a pull, a
  merge. `.qfai/state.json` is checkout-local, so a flag pinned to nothing but
  the checkout let the first branch processed decide for all of them: migrate a
  branch with no legacy row, record `done`, switch to a branch that has them,
  and this pass reads neither ledger nor history again while item 10 rejects
  those rows forever. Set the flag even when the pass marked nothing: "these
  ledgers have no legacy row" is the answer, and re-deriving it every session is
  exactly the cost that put the migration in a per-item gate in the first place.
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
2. Find the commit that **last advanced** the row from the row's **patch
   history**, not with `git log -S`. The id is on both sides of a status-only
   change, and `-S` matches a filepair only when one side contains the string,
   so it walks back to the commit that _added_ the row instead. Use
   `git log -p -- <test-list.md>` and take the newest commit whose hunk changes
   that `TDD-ID`'s line (`git log -L` on the row also works where the line is
   stable). Call it `A`.
3. Read the row's `Evidence` anchor **as of `A`**. It named
   `atdd-<spec-id>.md` → the row was advanced after the split; it gets no
   marker.
4. It named `implement-<spec-id>.md` → check **when** as well as where, against
   the boundary below. `A` before the boundary → append
   `Pre-split-evidence: implement` to the row's `Evidence` cell. `A` at or after
   it → no marker; that row wrote to the wrong file after the split, and the
   marker is not the fix for it.
5. Leave `Status`, `DR-ID` and the anchor itself untouched. The marker is the
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

Then, with `A` from step 2:

- `git merge-base --is-ancestor <B(L)> <A>` succeeds → `A` is at or after the
  split. No marker.
- It fails → `A` predates the split reaching this repository, and step 4's
  anchor test decides.
- No `B(L)` exists — the skill tree is untracked, or no committed copy of it
  routes `L` to the ATDD file — then no split has landed in this history, every
  row here predates it, and the anchor test decides alone.

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
