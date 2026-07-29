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
  carries both `DR-*` and `CR-*` references, and the ID is **retained** as the
  row re-runs through `red` / `green` / `refactor` / `done`, since clearing it
  on the next transition erases the only record of the approved reopen; and
- the reset is recorded in the CR's `Resolution` section (which rows, by
  `TDD-ID`).

## What stays prohibited

- Any backward transition not covered by an approved CR, including the named
  `green -> red` case. The error text is unchanged:
  `"Backward transition prohibited: green -> red"`.
- Resetting rows before approval. A CR at `Status: open` authorises nothing.
- Resetting rows the CR's "Approved actions" did not name.

## Ordering against the drift protocol

`.qfai/assistant/constitution/drift-protocol.md` resumes downstream work only
after the owner skill has been rerun and the upstream artifacts are updated.
The ledger sweep is downstream work, so it follows the owner-skill rerun; the
CR's `Applied at` is set once both are done. An `approved` CR without
`Applied at` is still unresolved and blocks spec completion.
