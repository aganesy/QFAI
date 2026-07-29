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

The full suite runs at, and only at:

- the **last row of the ledger** — so every spec pays for one full run;
- the **last row of each BR/AC group** of rows, as grouped in
  `06_Test-Cases.md`;
- any row whose implementation touched a module **outside** the package
  resolved in step 3 — a cross-package edit re-widens the run immediately.

Rows that are not on a boundary are gated on the narrow suite alone: items 6, 7
and 8 of the 11-point gate are evaluated against it, and item 11 requires the
full suite only for a row that sits on a boundary.

### A boundary failure is an anomaly, not a rollback

Backward transitions stay prohibited. A row already `done` is never re-opened
when a later boundary's full suite fails. Instead:

- the row **at** the boundary transitions to `exception` with a DR-ID;
- the regression is filed as a new `todo` row in the ledger, carrying the
  failing selector;
- spec completion is blocked until that row reaches `done`, because
  "Checkpoint verification passed" is a spec completion condition.
