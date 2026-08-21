# Ledger preconditions

`.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger every step of
`/qfai-implement` reads. This file states where it comes from, how to recover it
when it is absent, and how to tell a truthfully empty ledger from an incomplete
one.

## Producer

`/qfai-sdd` Phase 2b seeds this ledger from `06_Test-Cases.md`, in two groups:

- **one row per coverage-target TC** — the rows this skill drives end to end,
  and the only ones `TDDLIST_TC_NOT_COVERED` demands;
- **one `Layer = Integration` row per integration-level TC** — a TC whose
  `Level` is `L3` or the word `integration`. These are ATDD-owned rows
  (`execution-ledger.md#atdd-owned-rows`): their tests are authored by
  `/qfai-atdd` and their `Evidence` anchors into
  `.qfai/evidence/atdd-<spec-id>.md`, but the row itself lives here and this
  skill advances it under every rule that file states.

`US-*` / `CON-API-*` are ATDD obligations traced by `QFAI:` annotations, not
ledger rows — they never appear as rows here.

**No validator asks for the second group.** An integration-level TC is not a
coverage target, so `TDDLIST_TC_NOT_COVERED` stays silent whether its row is
present or absent. Phase 2b is that row's only producer, and a clean
`npx qfai validate` is not evidence that the row was unwanted.

## Recovery when it is missing

Rerun `/qfai-sdd <spec-id>` for the target spec, or copy
`.qfai/assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md` into the
spec directory and derive the rows from `06_Test-Cases.md`.

Do **not** proceed with an absent ledger, and do **not** invent rows that no TC
backs.

## An empty ledger is a fault only when `06_Test-Cases.md` disagrees

A header-only table has very different causes and they need opposite responses,
so never treat "no rows" as "nothing to do" on its own.

Before exiting, read `06_Test-Cases.md` and confirm it declares **neither** a
coverage-target TC **nor** an integration-level TC. Judge the first exactly as
the validator judges it
(`qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`); the
second no validator judges at all, so read the `Level` cells yourself.

### What counts as a coverage target

A TC is a target **unless** its `Level` names a non-coverage layer. Both
spellings the shipped artifacts use count: the words `integration` / `e2e` /
`system` / `acceptance` / `api`, and the codes `L3` / `L4` / `L5` that
`06_Test-Cases.md` writes. Matching is case-insensitive.

That is an exclusion list, not an allowlist:

- an empty or unrecognised `Level` makes the TC a target;
- a `06_Test-Cases.md` with no `Level` column at all makes **every** TC a target.

Never narrow this to a chosen pair of level names. Guidance that names a
narrower allowlist makes a header-only ledger look truthful and skips the whole
implementation.

Being a non-target is not being row-less. `integration` / `L3` sits on the
exclusion list because `TDDLIST_TC_NOT_COVERED` does not gate it, not because
the ledger has no row for it — it has the ATDD-owned `Layer = Integration` row
named under **Producer**, and that row is why a spec whose obligations are all
integration-level is not finished when the gate is quiet.

### The outcomes

- **Neither is declared** — the ledger is truthfully empty. Report
  "nothing to do" and exit. Rerunning `/qfai-sdd` derives the same empty table
  and loops.
- **At least one coverage-target TC is declared** — the ledger is incomplete (a
  partial copy or an interrupted Phase 2b) and `npx qfai validate` reports
  `TDDLIST_TC_NOT_COVERED`. Run the recovery above instead of exiting.
- **Only integration-level TCs are declared** — the ledger is incomplete in the
  same way, and nothing says so: the rows Phase 2b owes are the ATDD-owned
  group, which no gate demands. Run the recovery here too. This is the case a
  silent `validate` makes look finished.
