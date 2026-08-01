# Ledger preconditions

`.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger every step of
`/qfai-implement` reads. This file states where it comes from, how to recover it
when it is absent, and how to tell a truthfully empty ledger from an incomplete
one.

## Producer

`/qfai-sdd` Phase 2b seeds one row per coverage-target TC from
`06_Test-Cases.md`. `US-*` / `CON-API-*` are ATDD obligations traced by `QFAI:`
annotations, not ledger rows — they never appear as rows here.

## Recovery when it is missing

Rerun `/qfai-sdd <spec-id>` for the target spec, or copy
`.qfai/assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md` into the
spec directory and derive the rows from `06_Test-Cases.md`.

Do **not** proceed with an absent ledger, and do **not** invent rows that no TC
backs.

## An empty ledger is a fault only when `06_Test-Cases.md` disagrees

A header-only table has two very different causes and they need opposite
responses, so never treat "no rows" as "nothing to do" on its own.

Before exiting, read `06_Test-Cases.md` and confirm it declares **no**
coverage-target TC, judged exactly as the validator judges it
(`qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`).

### What counts as a coverage target

A TC is a target **unless** its `Level` reads `integration` / `e2e` / `system` /
`acceptance`. That is an exclusion list, not an allowlist:

- an empty or unrecognised `Level` makes the TC a target;
- a `06_Test-Cases.md` with no `Level` column at all makes **every** TC a target.

Never narrow this to a chosen pair of level names. Guidance that names a
narrower allowlist makes a header-only ledger look truthful and skips the whole
implementation.

### The two outcomes

- **No coverage-target TC is declared** — the ledger is truthfully empty. Report
  "nothing to do" and exit. Rerunning `/qfai-sdd` derives the same empty table
  and loops.
- **At least one is declared** — the ledger is incomplete (a partial copy or an
  interrupted Phase 2b) and `npx qfai validate` reports `TDDLIST_TC_NOT_COVERED`.
  Run the recovery above instead of exiting.
