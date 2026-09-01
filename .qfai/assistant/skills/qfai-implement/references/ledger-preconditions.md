# Ledger preconditions

`.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger every step of
`/qfai-implement` reads. This file states where it comes from, how to recover it
when it is absent, and how to tell a truthfully empty ledger from an incomplete
one.

## Producer

`/qfai-sdd` Phase 2b seeds one row per independently observable boundary of a
coverage-target TC from `06_Test-Cases.md` — a matrix-shaped TC arrives already
split into N rows, each repeating that `TC-*` in `TC-Refs` and identifying its
own boundary in a `Boundary` cell. `Boundary` is seed-owned: a review-fix
handback rewrites `Selector` and `Test file`, never `Boundary`, so the next
reseed still matches the row it belongs to. A ledger seeded before that rule can
still hold one aggregate row for a matrix TC; rerun `/qfai-sdd <spec-id>` to have
Phase 2b re-split it — splitting a row in-cycle is an upstream edit this skill
does not own, and the re-split lands whole or not at all under an approved
`CR-*` enumerating the aggregate rows, per
`references/change-request-reset.md`. Until that CR is approved the ledger is
unchanged — but **do not execute the aggregate row**. It is the shape the
re-split exists to remove: one selector over several boundaries observes only
the first failing assert, so running it produces exactly the incomplete RED
provenance this rule rejects, and nothing stops that row reaching `done` while
the CR is still pending. Move it `todo -> blocked` instead, naming the pending
`CR-*` in `Blocked-By` (`references/execution-ledger.md`), and pick up the next
row. The blocker clears when the CR is approved and Phase 2b re-splits the row.
`US-*` / `CON-API-*` are ATDD obligations traced by `QFAI:`
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

### The two outcomes

- **No coverage-target TC is declared** — the ledger is truthfully empty. Report
  "nothing to do" and exit. Rerunning `/qfai-sdd` derives the same empty table
  and loops.
- **At least one is declared** — the ledger is incomplete (a partial copy or an
  interrupted Phase 2b) and `npx qfai validate` reports `TDDLIST_TC_NOT_COVERED`.
  Run the recovery above instead of exiting.
