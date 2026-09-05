# Ledger preconditions

`.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger every step of
`/qfai-implement` reads. This file states where it comes from, how to recover it
when it is absent, and how to tell a truthfully empty ledger from an incomplete
one.

## Producer

`/qfai-sdd` Phase 2b seeds one row per coverage-target TC from
`06_Test-Cases.md`, plus one `Layer = E2E` row per **active** `US-*` and one
`Layer = API` row per **active** `CON-API-*` the spec owns — the obligations
those layers carry in `US-Refs` / `CON-API-Refs`. "Active" is the
`.qfai/assistant/catalog/test-layers.md` exemption: a contract at
`x-qfai-status: planned` owes no API row, and a spec with no user-facing surface
owes no `US-*` row — the latter **only in a project that declares at least one
UI-bearing spec**. Where surface typing is unused `QFAI-ATDD-111` stays
project-wide, so every `US-*` is active and owes a row. Ownership of an API row
is the lowest-numbered spec whose own `spec-*/01..10` / `16_*` files name that
`CON-API-*`. Those rows are tracked here and their tests authored by
`/qfai-atdd`.

## Recovery when it is missing

Rerun `/qfai-sdd <spec-id>` for the target spec. That is the preferred route:
Phase 2b is the producer, and rerunning it restores all three groups by the same
rule that seeds them.

The manual fallback must restore the **same three groups**, not just the TC one.
Copy `.qfai/assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md`
into the spec directory — its header already carries `US-Refs` and
`CON-API-Refs` — then derive:

- one row per coverage-target TC in `06_Test-Cases.md` (obligation in
  `TC-Refs`);
- one `Layer = E2E` row per **active** `US-*` in `02_User-stories.md`
  (obligation in `US-Refs`, `TC-Refs` = `-`);
- one `Layer = API` row per **active** `CON-API-*` this spec owns (obligation in
  `CON-API-Refs`, `TC-Refs` = `-`).

Leave `Test file` and `Selector` at `-` on a restored acceptance row whose test
does not exist yet, exactly as Phase 2b seeds them, and restore the recorded
values where it does: Phase Red step 3b writes those two cells from the
`/qfai-atdd` handoff entry, so inventing a path here puts a value in the ledger
that no test answers to.

Deriving from `06_Test-Cases.md` alone reproduces the exact gap this recovery
exists to close: the acceptance rows never come back, and `/qfai-implement`
processes no acceptance item while `QFAI-ATDD-111` / `QFAI-ATDD-113` stay red.

Do **not** proceed with an absent ledger, and do **not** invent rows that no
`TC-*`, `US-*` or `CON-API-*` backs. "No TC backs it" is not a reason to drop an
E2E/API row — those rows are backed by their `US-*` / `CON-API-*` instead, and
carry `-` in `TC-Refs` because `catalog/test-layers.md` forbids a `TC-*` there.

## An empty ledger is a fault only when `06_Test-Cases.md` disagrees

A header-only table has two very different causes and they need opposite
responses, so never treat "no rows" as "nothing to do" on its own.

Before exiting, read **all three** Phase 2b sources and confirm each is empty:
`06_Test-Cases.md` declares no coverage-target TC, judged exactly as the
validator judges it
(`qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`);
`02_User-stories.md` declares no active `US-*`; and this spec owns no active
`CON-API-*`. Checking only `06_Test-Cases.md` calls a ledger truthfully empty
while its acceptance rows are simply missing.

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

- **No coverage-target TC is declared**, and the spec has no active `US-*` /
  `CON-API-*` either — the ledger is truthfully empty. Report
  "nothing to do" and exit. Rerunning `/qfai-sdd` derives the same empty table
  and loops.
- **At least one of the three is declared** — the ledger is incomplete (a partial
  copy or an interrupted Phase 2b). A missing TC row is reported by
  `npx qfai validate` as `TDDLIST_TC_NOT_COVERED`; a missing E2E / API row has no
  ledger-side code of its own and shows up only as `QFAI-ATDD-111` /
  `QFAI-ATDD-113` staying red, so it is on you to notice it here.
  Run the recovery above instead of exiting.
