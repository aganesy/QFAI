# Approved Change Request reset (the only sanctioned backward transition)

`tdd/test-list.md` has a forward-only lifecycle
(`todo -> red -> green -> refactor -> done`) and skips `done` rows on
re-execution. An approved upstream change can invalidate rows that already
reached `green`, `refactor` or `done`, and the Change Request template
(`.qfai/assistant/skills/qfai-sdd/templates/change-request.md`) instructs the
approved actions to "reset the `tdd/test-list.md` rows this change
invalidates". Without a stated exception that instruction is unperformable:
the skill would either violate the forward-only rule or leave a `done` row
holding an implementation result the approved change already invalidated.

## The mandatory preflight

The reset cannot be reached from the normal loop: `Required Process` starts by
selecting the first `todo` row, and the skill exits with "nothing to do" when
every row is `done` — exactly the state an approved reset is meant to reopen.
So the sweep is a **preflight**, not an opportunistic step:

1. On every run, before the ledger is read for any other purpose, enumerate
   `.qfai/decisions/CR-*.md` and keep those in scope for the target spec.
   **Both the approved and the still-open ones** — the open set is what the two
   rules below read, and enumerating only the approved ones made this preflight
   unable to see the blockers it is supposed to honour.
2. Apply every reset the approved ones authorise (conditions below).
3. Only then judge the ledger. A run whose preflight reset rows must not report
   "nothing to do", because the all-`done` state it would report is stale.

A run with no in-scope CR at all does nothing here and proceeds unchanged.

## While a CR is open, its blocked set is not selectable

**A row named in an open in-scope CR's blocked set is not selected**, whatever
its status. A `todo` row carries that as `blocked` in the ledger, parked by the
raiser at `.qfai/assistant/constitution/drift-protocol.md` step 2; a row past `todo`, and a `done` row, could
not be parked at all, because `todo -> blocked` is the only inbound edge there
is (`execution-ledger.md#allowed-transitions`). Reading the CR files here — the
record the parking is derived from — gives those rows the same protection
without an illegal transition, and without re-deriving the determination on
every pass, which is the loop `blocked` exists to stop.

The rows this covers are ordinary: a post-RED scope gap is raised from a row at
`red` or later, a checkpoint regression from one at `done`, and a `review-fix`
row is re-selected ahead of every `todo` row by the loop head, so without this
it would be picked up again on every run for as long as the approval takes.

## Releasing a row takes every open CR into account

A row can sit in more than one blocked set, and an approved CR releases only its
own claim. So the release is a re-evaluation, not an unconditional write:

- Recompute the **union** of the blocked sets of every CR still open and in
  scope, after this CR's approval has taken it out of that set.
- **A row still in the union stays where it is.** Remove only this CR's ID from
  `Blocked-By`, leaving the other blockers; do not write `blocked -> todo`, and
  do not apply this CR's reset to it. Returning it would put a row back into
  selection over an unresolved change and let a test that depends on it run and
  complete.
- **A row no longer in the union** takes the reset below in full: back to
  `todo`, this CR's ID recorded in `DR-ID`, and `Blocked-By` cleared.

Reading the approved CR's enumeration alone is what made this wrong: that list
says which rows the operator approved reopening, not which rows are free to
run.

## The exception

A `.qfai/decisions/CR-*.md` whose "Approved actions" name a downstream ledger
sweep may reset the rows that change invalidates back to `todo`. Those rows are
then re-executed rather than skipped.

This is an operator-approved act, not a skill decision. It is legal only when
all of the following hold:

- the CR's `Status` is `approved`, with `Approved by` and `Approved at`
  populated;
- the CR's "Approved actions" section **enumerates the rows** — the `TDD-ID`s,
  or a verifiable selection rule — so the reset scope is what the operator
  approved and not what the skill later decided was invalidated. A row outside
  that enumeration is not approved; widening the scope needs a new CR;
- each reset row records that CR's ID in its `DR-ID` column — that column
  carries both `DR-*` and `CR-*` references as a comma-separated list, and the
  ID is **retained** as the row re-runs through `red` / `green` / `refactor` /
  `done`, since clearing it on the next transition erases the only record of the
  approved reopen; and
- the reset is recorded in the CR's `Resolution` section (which rows, by
  `TDD-ID`).

## A retained `CR-*` is not an exception's `DR-*`

A reset row that later hits an anomaly still owes a Decision Record. The
retained `CR-*` records the approved reopen, not the anomaly, so it does not
satisfy the `exception` requirement on its own: add the `DR-*` alongside it
(`DR-NNNN, CR-YYYYMMDD-NNNN`). `TDDLIST_EXCEPTION_MISSING_DR` fires on an
`exception` row whose `DR-ID` cell is empty **or holds `CR-*` references only**.

## What stays prohibited

- Any backward transition not covered by an approved CR, including the named
  `green -> red` case. The error text is unchanged:
  `"Backward transition prohibited: green -> red"`.
- Resetting rows before approval. A CR at `Status: open` authorises nothing.
- Resetting rows the CR's "Approved actions" did not name.

## When an in-scope CR counts as resolved

The spec completion gate covers only the `.qfai/decisions/CR-*.md` **in scope for
this spec**: `Impact scope` names this spec or a shared policy it depends on, or
this spec's artifacts reference it. A CR confined to another spec never blocks
this one.

An in-scope CR is **resolved** only when every one of these holds. A CR failing
any single one — a half-filled record included — is **unresolved** and blocks
completion:

- `Status` is `approved`, `rejected` or `superseded` (never `open`);
- `Approved by` / `Approved at` are populated, plus `Approved option` when
  `Status` is `approved` and `Superseded by` when it is `superseded`;
- `Resolution` records what was actually done; and
- when `Status` is `approved`, `Applied at` is populated — approval alone does
  not release the gate. It is set only after the owner-skill rerun in "Approved
  actions" completed and upstream artifacts are updated, which is when
  `.qfai/assistant/constitution/drift-protocol.md` resumes downstream work.

## Ordering against the drift protocol

`.qfai/assistant/constitution/drift-protocol.md` resumes downstream work only
after the owner skill has been rerun and the upstream artifacts are updated.
The ledger sweep is downstream work, so it follows the owner-skill rerun; the
CR's `Applied at` is set once both are done. An `approved` CR without
`Applied at` is still unresolved and blocks spec completion.
