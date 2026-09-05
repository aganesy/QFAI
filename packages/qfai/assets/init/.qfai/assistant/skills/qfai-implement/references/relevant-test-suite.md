# Relevant Test Suite

What "run the relevant test suite" resolves to in Phase: Refactor step 2, and
where the wide run is actually paid for.

## Resolution order

"Relevant" means the smallest selector that covers the module you touched
**plus everything that depends on it**, direct or indirect.

1. **The touched module's own tests** — the test modules named by this item's
   ledger row.
2. **The tests of its reverse dependency closure.** Walk the **production**
   import graph backwards from the touched module `X`: the modules that import
   `X`, the modules that import those, and so on until the walk closes. Include
   the test modules of every module in that closure.

   Searching test files for a direct import of `X` is not enough. The common
   shape is: `X` <- `Y` (production) <- `Y`'s test. `Y`'s test imports only `Y`,
   so a test-file scan finds nothing, the fallback is never reached, and a
   broken `Y` still passes the narrow gate.

3. **Fallback: the package containing the touched module** — whenever the
   reverse walk cannot be completed. It cannot be completed when the graph
   contains dynamic imports, DI or container wiring, dependency-injected
   factories, reflection, generated code, or when no import-graph tool is
   available. Incomplete resolution always widens; it never narrows.
4. **Never "every test in the repository"** at this step — the wide run has its
   own cadence, below.

Record which of 1-3 was used in the item's evidence. "Narrow suite, closure
resolved" and "narrow suite, package fallback" are different claims, and only
the first one asserts the dependents were actually checked.

## Cadence

**Narrow suite per item; full suite at each checkpoint boundary.**

Running the whole spec suite once per item costs the sum over all prior items
and is quadratic in ledger size. That cost is paid at boundaries instead.

### Checkpoint boundaries

**This list is the single definition of the PER-ITEM boundary cadence — which
rows are boundaries.** `checkpoint-verification.md` and `SKILL.md` cite this
anchor and do not restate it — a second copy of the cadence is what let them
contradict it.

It is not the definition of every full-suite run. `checkpoint-verification.md`
tiers the boundaries into **per item** and **per spec**, and the spec-level one
is defined there, not here — when it is reached, the command set it takes, and
the seal it records. That boundary has no row, so a list of row predicates is
the wrong place to state it. Do not read the "only" below as licence to skip it,
and do not restate its condition here.

Within that per-item tier, the full suite runs at, and only at:

- the **last incomplete row this run completes** — while finishing a row, if no
  other row is left at `todo` / `red` / `green` / `refactor` / `review-fix`,
  that row is a boundary. It is deliberately **not** the physical last row of
  the file: a re-executed ledger routinely has its remaining `todo` rows above
  already-`done` or `exception` ones — rows appended later, or a backfilled
  gap — and the physical last row is then skipped, so the spec would finish
  without a full run at all. A run that completes no row has nothing to verify
  and no boundary;
- any row whose implementation **touched modules belonging to more than one
  package**, or touched a module outside the package that owns this item's own
  test modules — a cross-package edit re-widens the run immediately. Resolve
  the owning package of every touched module directly from its path; this is
  evaluated **independently of the resolution step used above**, so a fully
  closed reverse walk (step 2, where step 3's fallback package never exists)
  does not skip it;
- every **N-th** completed row, with `N = 10` by default. Record the chosen `N`
  in the item's evidence when a project overrides it.

The counted interval is what keeps the cadence sub-quadratic. An AC or BR group
is **not** a boundary: in a spec where TC and AC are close to one-to-one — as in
this repository's `spec-0006`, whose `TC-0006-0001..0009` each map to a distinct
AC and each occupy one ledger row — every row would be the last of its group and
the per-item full run would be right back. The boundary must be coarser than the
obligation granularity, so it is defined by count, not by grouping.

Rows that are not on a boundary are gated on the narrow suite alone: items 6, 7
and 8 of the 12-point gate are evaluated against it, and the gate item that
cites `SKILL.md#checkpoint-verification` (item 12 of the 12-point gate) requires
the full suite only for a row that sits on a boundary.

### Checkpoint runs before `done`, never after

The lifecycle allows `refactor -> exception` but forbids re-opening a `done`
row, so verification has to happen while the row is still `refactor`:

- run the checkpoint at the end of Refactor, after the reviewers return PASS;
- PASS -> `refactor -> done`;
- FAIL -> `refactor -> exception` with a DR-ID, and the regression is filed as
  a new `todo` row carrying the failing selector.

Rows already `done` from earlier boundaries are never re-opened. Spec completion
stays blocked until the new row reaches `done`, because "Checkpoint verification
passed" is a spec completion condition.
