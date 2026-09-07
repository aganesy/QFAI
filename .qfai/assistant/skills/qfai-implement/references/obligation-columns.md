# Obligation columns

Which column carries a row's obligation, and when the optional ones become
required. Split out of `execution-ledger.md`, which had reached the shipped
line ceiling; the text is unchanged.

A row's obligation lives in the column its `Layer` selects. `TC-Refs` is the one
every row has; the other two are optional columns that become required when the
row's layer cannot host a `TC-*`.

| Column       | Description                                                                       |
| ------------ | --------------------------------------------------------------------------------- |
| US-Refs      | `US-*` obligations this row implements. Legal **only** on `Layer = E2E` rows      |
| CON-API-Refs | `CON-API-*` obligations this row implements. Legal **only** on `Layer = API` rows |
| Blocked-By   | What a `blocked` row is waiting on. Required on `blocked` rows, blank otherwise   |

`Blocked-By` takes a Change Request ID (`CR-YYYYMMDD-NNNN`), a contract path
with line (`.qfai/contracts/db/CON-DB-0005.sql:2715`), or a cross-spec row
(`spec-0006:TDD-0034`). `DR-ID` is **not** widened to carry it: that column is
what distinguishes a parked `exception` from a row that never started, and
overloading it would merge the two states the `blocked` status exists to
separate.

`test-layers.md` forbids `TC-*` annotations in `tests/e2e/**` and `tests/api/**`,
so an E2E or API row has no legal `TC-Refs` value. Those rows carry `-` in
`TC-Refs` and record their obligation in `US-Refs` / `CON-API-Refs` instead.

**Both columns are seeded, not hand-added.** `/qfai-sdd` Phase 2b writes one
`Layer = E2E` row per active `US-*` and one `Layer = API` row per active
`CON-API-*` the spec owns, and the shipped ledger template carries the two
columns in its header for exactly that reason — a row of that layer with nowhere
to record its obligation is unverifiable, and `validateObligationColumn` reads an
absent column as "this row carries no such obligation". "Active" is the
`test-layers.md` exemption: a spec with no user-facing surface owes no `US-*`
row and a contract at `x-qfai-status: planned` owes no API row, so seeding
either would park a completion-prohibiting row on a test that must not be
written. **The surface half is itself conditional**: `QFAI-ATDD-111` is scoped
by surface type **only in a project that declares at least one UI-bearing
spec**. Where surface typing is unused the obligation stays project-wide, so
every `US-*` is active and owes a row — reading that exemption unconditionally
in such a project drops every E2E row and leaves the gate with nothing to
clear it. And because that condition is a property of the **project**, a
`/qfai-sdd` run that adds its first surface signal or removes its last re-runs
the E2E-row delta over every spec's ledger, not only the spec it targeted.

**A seeded acceptance row's `Test file` and `Selector` are `-` until Phase Red
step 3b writes them.** Phase 2b seeds the row before the acceptance test exists
and invents no path for it, and `/qfai-atdd` — which authors the test — never
writes this ledger; so the path and selector first exist in that stage's handoff
entry, as the row identity, and this skill copies both into the row in the same
edit that moves it out of `todo`. That is why the `Test file` existence check
below starts at `green` and not at `todo`: a seeded row legitimately has no test
file yet. Naming no writer for the two cells left them at `-` for the row's
whole life, so the row could be selected, handed over and never run.

The binding is enforced in both directions: a `TC-*` on an E2E/API row raises
`TDDLIST_OBLIGATION_LAYER_MISMATCH` and is **not** counted towards TC coverage,
so a forbidden placement cannot close a coverage-target TC.
`TDDLIST_OBLIGATION_LAYER_MISMATCH` likewise rejects a `US-Refs` /
`CON-API-Refs` value on a layer that does not own it, and — on a ledger whose
header carries the column — an `E2E` / `API` row that leaves it empty or `-`.
That last direction is what stops a seeded obligation row from reaching `done`
with nothing recorded: `TC-Refs` is forbidden on it, so an empty obligation
cell leaves the row with no auditable target at all. It fires only where the
column exists, so an eight-column ledger written before these columns shipped is
a legacy shape, not an error.

**A legacy ledger needs a reader rule, not only that waiver.** Its `E2E` / `API`
rows recorded their `US-*` / `CON-API-*` in `TC-Refs`, the only cell they had;
waiving the validator alone leaves such a row selectable but with nothing in the
column Phase Red step 3 and the per-item evidence contract read, so it stops at
the handoff. Until the columns exist, read a non-`TC-*` obligation token in
`TC-Refs` as that row's obligation — the row's `Layer` says which kind it is —
and record it as the `US-ref` / `CON-API-ref` the evidence contract names. This
fallback is for reading an existing ledger, never for writing one: the next
`/qfai-sdd` Phase 2b reseed migrates the ledger, adding both columns and moving
each token into the one its `Layer` owns as a cell move that keeps `Status`,
`DR-ID` and `Evidence`.

A `Layer` outside the legal values raises `TDDLIST_UNKNOWN_LAYER` (warning) —
without a legal `Layer` the row has no obligation column. Coverage counting
excludes `API` and `E2E` specifically rather than allowlisting the other three,
so a mistyped layer keeps counting and is reported by that warning, which names
the real cause; an allowlist would instead drop the row silently and resurface
as a coverage error about a TC the author did cover.

Coverage measurement is otherwise unaffected: it reads `TC-*` tokens only, so
non-TC obligation IDs are inert to it by design.
