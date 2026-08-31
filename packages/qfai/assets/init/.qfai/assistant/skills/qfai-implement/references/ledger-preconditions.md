# Ledger preconditions

`.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger every step of
`/qfai-implement` reads. This file states where it comes from, how to recover it
when it is absent, and how to tell a truthfully empty ledger from an incomplete
one.

## Producer

`/qfai-sdd` Phase 2b seeds this ledger from `06_Test-Cases.md`, in two groups.
**Read each TC's `Level` once and route it to exactly one group** — the groups
are exclusive, and a TC in both is a TC whose test two skills write.

- **one row per coverage-target TC that declares a `Level` the layer vocabulary
  recognises** — `L1` / `L2` and their word forms `unit` / `component`, the
  spellings **What counts as a coverage target** below reads as unit or
  component work. These are the rows this skill drives end to end;
- **one `Layer = Integration` row per integration-level TC** — **every** `Level`
  whose ATDD annotation routes to `tests/integration/**`: `L3`, the word
  `integration`, a blank cell, a spelling that names no layer (`smoke`, a typo),
  **and `system` / `acceptance`**. These are ATDD-owned
  rows (`execution-ledger.md#atdd-owned-rows`): their tests are authored by
  `/qfai-atdd` and their `Evidence` anchors into
  `.qfai/evidence/atdd-<spec-id>.md`, but the row itself lives here and this
  skill advances it under every rule that file states.

**Route by where the annotation goes, not by whether you recognise the word.**
The second group is defined by `QFAI-ATDD-112`'s routing, and asking instead
"is this spelling unknown?" leaves a gap: `system` and `acceptance` are _in_ the
layer vocabulary — so they are not unrecognised — and are not unit or component
either, so a spelling test puts them in **no group at all**, while ATDD routes
both to `tests/integration/**` and its P4 writes their tests. The result is a TC
whose test one stage owns and whose handoff row nothing seeds, so Phase Red step
3b never has a handoff to read. Reading the routing covers them with no extra
rule, and covers the next such `Level` too.

**A blank _or unrecognised_ `Level` belongs to the second group** for the same
reason: the ATDD collector routes every `Level` it cannot
read — no cell at all, and any spelling that names no layer — to
`tests/integration/**` and that stage's P4 writes the test
(`qfai-atdd/SKILL.md`, coverage obligations). Seeding it as a first-group row
instead has this skill and `/qfai-atdd` each write a test for one TC, and
nothing upstream reliably prevents that input: `TDDLIST_UNKNOWN_LEVEL` is a
`warning` and waivable, so an unrecognised `Level` reaches Phase 2b unfixed. Its
`Layer = Integration` row still discharges `TDDLIST_TC_NOT_COVERED`, which asks
only that **some** row carry the TC in `TC-Refs` and accepts `TC-Refs` on an
`Integration` row; `TDDLIST_COVERAGE_LAYER_MISMATCH` stays silent too, because
only `L1` / `L2` name an expected layer to disagree with — a `Level` the
vocabulary cannot read names none. Declaring a recognised `Level` upstream is the
better fix — the routing above is what keeps an unreadable one owned exactly once
until then.

**One row per independently observable boundary, and at least one per TC.**
"One row" is a floor, not a cap: a matrix-shaped TC — several rejection reasons,
a status-code matrix, several independent state transitions — is seeded as one
row per boundary, every row carrying that TC in `TC-Refs`
(`selector-granularity.md`; `TC-Refs` is many-to-many with `TDD-ID`). For an
`Integration` TC that split belongs to Phase 2b: `/qfai-atdd` never writes this
ledger and takes its RED per row at P1b, so a row that reaches it conflating
several boundaries has no splitter of its own and its RED is invalid by
construction.

`US-*` / `CON-API-*` are ATDD obligations traced by `QFAI:` annotations, not
ledger rows — they never appear as rows here.

**No validator asks for the second group** — with two exceptions, the blank and
the unrecognised `Level` above, which the gate counts because it counts every TC
it cannot exclude. A TC that declares `L3` or `integration` is not a coverage target, so
`TDDLIST_TC_NOT_COVERED` stays silent whether its row is present or absent.
Phase 2b is that row's only producer, and a clean `npx qfai validate` is not
evidence that the row was unwanted.

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

This section answers "what does the gate demand a row for", not "what `Layer`
does the row carry". Being a non-target is not being row-less: `integration` /
`L3` sits on the exclusion list because `TDDLIST_TC_NOT_COVERED` does not gate
it, not because the ledger has no row for it — it has the ATDD-owned
`Layer = Integration` row named under **Producer**, and that row is why a spec
whose obligations are all integration-level is not finished when the gate is
quiet. Symmetrically, an **empty or unrecognised** `Level` is a target here and
still takes an `Integration` row: it is the same one row, seeded by the second
group and counted by this gate.

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
