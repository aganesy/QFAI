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

A TC that **declares** a `Level` is a target **unless** that `Level` names a
non-coverage layer. Both spellings the shipped artifacts use count: the words
`integration` / `e2e` / `system` / `acceptance` / `api`, and the codes `L3` /
`L4` / `L5` that `06_Test-Cases.md` writes. Matching is case-insensitive.

Among declared values that is an exclusion list, not an allowlist: an
unrecognised `Level` — a typo, a project's own word, the illegal multi-valued
cell — still makes the TC a target, and `TDDLIST_UNKNOWN_LEVEL` (`warning`)
names it so the cell gets fixed rather than the ledger. Never narrow this to a
chosen pair of level names. Guidance that names a narrower allowlist makes a
header-only ledger look truthful and skips the whole implementation.

### A TC with no declared `Level` is not a target here

A blank `Level` cell, and a `06_Test-Cases.md` with no `Level` column at all,
declare nothing — and an absent cell is not an unreadable one. Such a TC is
owned by `/qfai-atdd`, not by this ledger: an undeclared `Level` routes to
`tests/integration/**` (`catalog/test-layers.md`), `QFAI-ATDD-112` (`error`)
holds it there, and that stage's P4 writes the test. It is not owed by nothing,
so do **not** seed a row for it — the row's `Layer` would have no value the spec
supports, and `Layer` is what selects a row's evidence file at the completion
gate (`execution-ledger.md`).

If a `Level`-less TC should be implement-owned, the fix is in
`06_Test-Cases.md`: declare a coverage-target `Level` (`L1` or `L2`), and Phase
2b seeds the row on the next run.

A ledger written before this rule may already hold such a row — the older rule
did make a `Level`-less TC a target. `QFAI-TCLEVEL-001` (`warning`)
reports each one, because the row keeps the TC on this ledger while
`QFAI-ATDD-112` holds the same TC. Do not implement it: either declare the TC's
`Level` or retire the row through `/qfai-sdd`. A row whose `Layer` is
`Integration` is not reported — that one already agrees with the TC's ATDD home.
A decomposition reference counts as naming the TC it belongs to: a row citing
`TC-NNNN-NNNN` is reported against the `TC-NNNN` written in `06_Test-Cases.md`,
unless the sub-ID is declared there in its own right with a `Level` of its own.

### The `Layer` a seeded row carries

Every row seeded from `06_Test-Cases.md` comes from a declared coverage-target
`Level`, so its `Layer` is the crosswalk pair of that level — `Unit` for `L1`,
`Component` for `L2` — and its evidence goes to
`.qfai/evidence/implement-<spec-id>.md`. `Integration` / `API` / `E2E` rows do
live in this ledger, but they are ATDD-owned and Phase 2b does not seed them
(`execution-ledger.md#atdd-owned-rows`).

### The two outcomes

- **No coverage-target TC is declared** — the ledger is truthfully empty. Report
  "nothing to do" and exit. Rerunning `/qfai-sdd` derives the same empty table
  and loops. A spec whose TCs are all `L3`-`L5` or all `Level`-less is this
  case, and its tests are `/qfai-atdd`'s: say so when reporting, rather than
  reporting the spec as having nothing to test.
- **At least one is declared** — the ledger is incomplete (a partial copy or an
  interrupted Phase 2b) and `npx qfai validate` reports `TDDLIST_TC_NOT_COVERED`.
  Run the recovery above instead of exiting.
