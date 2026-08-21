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
`Evidence` anchor named the implement file in the commit that last advanced it.
Written into the gate, a one-time repository-wide migration — `git log -p` over
the whole ledger, per row — was re-read on every completion check, and its
stated trigger ("run it as part of taking this version") named no phase, so
nothing ever ran it. Unmarked legacy rows are then reported rather than accepted
forever: the safe direction, but a permanent one, and the rows it holds can
never finish.

So item 10 reads the marker, and this pass writes it.

## The guard

The pass runs **once per repository**. Its flag is `migrations.preSplitEvidence`
in `.qfai/state.json`:

```json
{ "migrations": { "preSplitEvidence": "done" } }
```

- **Flag set → skip.** Read no ledger, walk no history; report the skip in one
  line and continue with the next Preflight obligation.
- **Flag absent → run the procedure below, then set the flag.** Set it even when
  the pass marked nothing: "this repository has no legacy row" is the answer,
  and re-deriving it every session is exactly the cost that put the migration in
  a per-item gate in the first place.
- Write the flag with the same create-or-merge rule as every other key in that
  file: preserve unrelated top-level keys, never rewrite the file wholesale.
- `.qfai/state.json` is per-checkout and not committed, so a fresh clone runs
  the pass again. That is harmless rather than a second migration: the procedure
  is idempotent — a row that already carries the marker is left alone — and it
  re-derives the same answer from the same history.

## The procedure

**Write it once, from the history**, for **every** `E2E` / `API` row past
`todo` in every in-scope `test-list.md` — `red` and `green` and `refactor` as
much as `done` and `review-fix`. A row interrupted mid-cycle by the upgrade has
legitimately stored evidence in the implement file too, and skipping it leaves
that row unable to finish: unmarked, it is judged by the current rule whatever
its status, so the evidence it lawfully wrote is rejected at item 10.

For each such row:

1. Find the commit that **last advanced** the row from the row's **patch
   history**, not with `git log -S`. The id is on both sides of a status-only
   change, and `-S` matches a filepair only when one side contains the string,
   so it walks back to the commit that _added_ the row instead. Use
   `git log -p -- <test-list.md>` and take the newest commit whose hunk changes
   that `TDD-ID`'s line (`git log -L` on the row also works where the line is
   stable).
2. Read the row's `Evidence` anchor **as of that commit**.
   - It named `implement-<spec-id>.md` → append `Pre-split-evidence: implement`
     to the row's `Evidence` cell.
   - It named `atdd-<spec-id>.md` → the row was advanced after the split. It
     gets no marker.
3. Leave `Status`, `DR-ID` and the anchor itself untouched. The marker is the
   only thing this pass writes.

An `Integration` row gets no marker. It was ATDD-owned from the start, so it has
no pre-split location to be compatible with.

## What the marker does not license

Status and anchor alone cannot tell a legacy row from a new `E2E` / `API` row
written to the wrong file — which is why item 10 refuses an implement anchor
that carries no marker, and why this pass reads history rather than status.
Marking a row whose last advance already pointed at the ATDD file would let a
row that never produced its ATDD handoff be accepted as complete, which is the
one thing the marker exists to keep out.
