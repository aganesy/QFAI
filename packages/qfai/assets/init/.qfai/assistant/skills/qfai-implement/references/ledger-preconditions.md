# Ledger preconditions

`.qfai/specs/<spec-id>/tdd/test-list.md` is the execution ledger every step of
`/qfai-implement` reads. This file states where it comes from, how to recover it
when it is absent, and how to tell a truthfully empty ledger from an incomplete
one.

## Producer

`/qfai-sdd` Phase 2b seeds this ledger in **four** groups — one from
`06_Test-Cases.md` per coverage-target TC, one from `06_Test-Cases.md` per
integration-level TC, one per active `US-*` and one per active `CON-API-*`.
**Read each TC's `Level` once and route it to exactly one of the two TC
groups** — those two are exclusive, and a TC in both is a TC whose test two
skills write.

- **one row per coverage-target TC that declares a `Level` the layer vocabulary
  recognises** — `L1` / `L2` and their word forms `unit` / `component`, the
  spellings **What counts as a coverage target** below reads as unit or
  component work. These are the rows this skill drives end to end;
- **one `Layer = Integration` row per integration-level TC** — **every** `Level`
  whose ATDD annotation routes to `tests/integration/**`: `L3`, the word
  `integration`, a blank cell, a spelling that names no layer (`smoke`, a typo),
  **and `system` / `acceptance`**;
- **one `Layer = E2E` row per active `US-*`** the spec owns, the obligation in
  `US-Refs`;
- **one `Layer = API` row per active `CON-API-*`** the spec owns, the obligation
  in `CON-API-Refs`.

"Active" is the `.qfai/assistant/catalog/test-layers.md` exemption: a contract at
`x-qfai-status: planned` owes no API row, and a spec with no user-facing surface
owes no `US-*` row — the latter **only in a project that declares at least one
UI-bearing spec**. Where surface typing is unused `QFAI-ATDD-111` stays
project-wide, so every `US-*` is active and owes a row. Ownership of an API row
is the lowest-numbered spec whose own `spec-*/01..10` / `16_*` files name that
`CON-API-*`.

The last three groups are **ATDD-owned rows**
(`execution-ledger.md#atdd-owned-rows`): their tests are authored by
`/qfai-atdd` and their `Evidence` anchors into
`.qfai/evidence/atdd-<spec-id>.md`, but the rows themselves live here, Phase 2b
is their producer, and this skill advances them under every rule that file
states.

**Route by where the annotation goes, not by whether you recognise the word.**
The integration group is defined by `QFAI-ATDD-112`'s routing, and asking instead
"is this spelling unknown?" leaves a gap: `system` and `acceptance` are _in_ the
layer vocabulary — so they are not unrecognised — and are not unit or component
either, so a spelling test puts them in **no group at all**, while ATDD routes
both to `tests/integration/**` and its P4 writes their tests. The result is a TC
whose test one stage owns and whose handoff row nothing seeds, so Phase Red step
3b never has a handoff to read. Reading the routing covers them with no extra
rule, and covers the next such `Level` too.

**A blank _or unrecognised_ `Level` belongs to the integration group** for the
same reason: the ATDD collector routes every `Level` it cannot
read — no cell at all, and any spelling that names no layer — to
`tests/integration/**` and that stage's P4 writes the test
(`qfai-atdd/SKILL.md`, coverage obligations). Seeding it as a coverage-target row
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

`US-*` / `CON-API-*` reach this ledger as their own E2E / API rows and are traced
by `QFAI:` annotations — they never appear in a TC row's `TC-Refs`, and an
E2E / API row carries `-` there (`catalog/test-layers.md` forbids a `TC-*` on
one).

**No validator asks for the integration group** — with two exceptions, the blank
and the unrecognised `Level` above, which the gate counts because it counts every
TC it cannot exclude. A TC that declares `L3` or `integration` is not a coverage
target, so `TDDLIST_TC_NOT_COVERED` stays silent whether its row is present or
absent. A missing E2E / API row has no ledger-side code of its own either, and
shows up only as `QFAI-ATDD-111` / `QFAI-ATDD-113` staying red. Phase 2b is the
only producer of all three, and a clean `npx qfai validate` is not evidence that
those rows were unwanted.

## Recovery when it is missing

Rerun `/qfai-sdd <spec-id>` for the target spec. That is the preferred route:
Phase 2b is the producer, and rerunning it restores all four groups by the same
rule that seeds them.

The manual fallback must restore the **same four groups**, not just the
coverage-target one. Copy
`.qfai/assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md`
into the spec directory — its header already carries `US-Refs` and
`CON-API-Refs` — then derive:

- one row per coverage-target TC in `06_Test-Cases.md` (obligation in
  `TC-Refs`);
- one `Layer = Integration` row per integration-level TC in `06_Test-Cases.md`
  (obligation in `TC-Refs`) — every `Level` the ATDD collector routes to
  `tests/integration/**`, per **Producer** above;
- one `Layer = E2E` row per **active** `US-*` in `02_User-stories.md`
  (obligation in `US-Refs`, `TC-Refs` = `-`);
- one `Layer = API` row per **active** `CON-API-*` this spec owns (obligation in
  `CON-API-Refs`, `TC-Refs` = `-`).

Leave `Test file` and `Selector` at `-` on a restored acceptance row whose test
does not exist yet, exactly as Phase 2b seeds them, and restore the recorded
values where it does: Phase Red step 3b writes those two cells from the
`/qfai-atdd` handoff entry, so inventing a path here puts a value in the ledger
that no test answers to.

Deriving only the coverage-target half reproduces the exact gap this recovery
exists to close: the acceptance rows never come back, and `/qfai-implement`
processes no acceptance item while `QFAI-ATDD-111` / `QFAI-ATDD-113` stay red.
The integration rows fail more quietly still — no code reports their absence at
all — so a recovery that reads `06_Test-Cases.md` for coverage targets and stops
leaves the ledger looking complete.

Do **not** proceed with an absent ledger, and do **not** invent rows that no
`TC-*`, `US-*` or `CON-API-*` backs. "No TC backs it" is not a reason to drop an
E2E / API row — those two are backed by their `US-*` / `CON-API-*` instead, and
carry `-` in `TC-Refs` because `catalog/test-layers.md` forbids a `TC-*` there.

## An empty ledger is a fault only when `06_Test-Cases.md` disagrees

A header-only table has very different causes and they need opposite responses,
so never treat "no rows" as "nothing to do" on its own.

Before exiting, read **all four** Phase 2b sources and confirm each is empty:
`06_Test-Cases.md` declares no coverage-target TC, judged exactly as the
validator judges it
(`qfai-sdd/references/spec-traceability-rules.md#tdd-execution-ledger`);
`06_Test-Cases.md` declares no integration-level TC either, which no validator
judges at all, so read the `Level` cells yourself;
`02_User-stories.md` declares no active `US-*`; and this spec owns no active
`CON-API-*`. Checking only the
coverage-target half calls a ledger truthfully empty while its integration and
acceptance rows are simply missing.

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
declare nothing — and an absent cell is not an unreadable one. The **test** for
such a TC is owned by `/qfai-atdd`, not by this skill: an undeclared `Level`
routes to `tests/integration/**` (`catalog/test-layers.md`), `QFAI-ATDD-112`
(`error`) holds it there, and that stage's P4 writes it.

Its **row** is still seeded, in the integration group under **Producer** above,
and carries `Layer = Integration` — the value that sends its evidence to
`.qfai/evidence/atdd-<spec-id>.md`, which is where that stage records. What must
never be seeded for it is a **coverage-target** row: `Unit` / `Component` is a
`Layer` the spec does not support for this TC, and it would have this skill
write a test `/qfai-atdd` is already writing.

If a `Level`-less TC should be implement-owned, the fix is in
`06_Test-Cases.md`: declare a coverage-target `Level` (`L1` or `L2`). The next
Phase 2b run then reclassifies it out of the integration group — a crossing
between the two TC groups, handled by the rule in
`../../qfai-sdd/references/sdd-phase-checklists.md`, not by rewriting the row's
`Layer` in place.

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

A row seeded from a declared coverage-target `Level` carries the crosswalk pair
of that level — `Unit` for `L1`, `Component` for `L2` — and its evidence goes to
`.qfai/evidence/implement-<spec-id>.md`. The other three groups carry
`Integration`, `E2E` and `API`; Phase 2b seeds those rows too, but they are
ATDD-owned and their evidence goes to `.qfai/evidence/atdd-<spec-id>.md`
(`execution-ledger.md#atdd-owned-rows`).

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

- **None of the four is declared** — the ledger is truthfully empty. Report
  "nothing to do" and exit. Rerunning `/qfai-sdd` derives the same empty table
  and loops.
- **At least one coverage-target TC is declared** — the ledger is incomplete (a
  partial copy or an interrupted Phase 2b) and `npx qfai validate` reports
  `TDDLIST_TC_NOT_COVERED`. Run the recovery above instead of exiting.
- **Only ATDD-owned obligations are declared** — integration-level TCs, active
  `US-*`, active `CON-API-*`, in any combination — the ledger is incomplete in
  the same way, and almost nothing says so: no ledger-side code demands the
  integration rows at all, and a missing E2E / API row shows up only as
  `QFAI-ATDD-111` / `QFAI-ATDD-113` staying red. Run the recovery here too, and
  say when reporting that this spec's tests are `/qfai-atdd`'s rather than
  reporting the spec as having nothing to test. This is the case a silent
  `validate` makes look finished.
