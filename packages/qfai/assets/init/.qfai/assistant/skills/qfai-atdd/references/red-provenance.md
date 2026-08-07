# RED Provenance for an ATDD-owned Ledger Row

`.qfai/specs/<spec-id>/tdd/test-list.md` is `/qfai-implement`'s execution
ledger, and `qfai-implement/SKILL.md` states the split: **`Layer = E2E` and
`Layer = API` rows are tracked there, but their tests are authored here.** This
skill therefore writes into a ledger whose status lifecycle it does not define.

## What this skill may write

- `Status`, `DR-ID` and `Evidence`, on `Layer = E2E` / `Layer = API` rows only.
  Nothing else in the ledger, and no other spec artifact.
- The lifecycle is
  `../../qfai-implement/references/execution-ledger.md#allowed-transitions`. It is
  forward-only from `todo`, and `todo -> red` requires an **admissible RED**: an
  assertion inside the row's own selector raised the failure, observed before
  the production code that makes it pass exists
  (`../../qfai-implement/references/red-admissibility.md`).

## Why the stage order makes this a real question

Work Orders build the API and integration surfaces a journey needs (P3, P4). A
journey written _after_ its surface passes on the first run, so there is nothing
to watch fail — and `qfai-implement/SKILL.md` classifies a test that
unexpectedly passes as an anomaly bound for `exception`.

Left unaddressed, that makes `exception` the only terminal state an ATDD-owned
row can reach, and a spec closes with its journeys recorded as anomalies rather
than as completed work.

## The three branches (MUST)

Take the first that applies, and record which one in the evidence file.

1. **Observed RED (preferred).** Write the journey or API test **against the
   current tree**, before this cycle builds any surface it needs.
   1. **Create the minimal seam first.** A test for a route that does not exist
      yet fails with a 404 or an import error, and that is a missing seam, not a
      RED. Register the route — or the export the test imports — with **no
      behaviour**: the declared status, an empty body, no predicate. This is the
      same step `/qfai-implement` Phase Red takes at 3a, for the same reason:
      without it the first failure of any new-surface row is a resolution error
      by construction.
   2. Run the test. An admissible failure is an assertion — or an
      expected-status check — inside this row's own selector, naming the
      predicate the row owns. Record the command and output as the row's RED
      pair, then build the surface and re-run for GREEN.

   Stage gate **P1b** is where this happens.

2. **Falsifiability (the surface is already there).** Two cases, one rule: the
   surface predates this cycle, or this cycle built it before the journey was
   written — the ordinary shape when branch 1's seam step was not taken, or when
   the work order sequenced surfaces first. Either way the correct test passes on
   its first run. Do **not** weaken it to manufacture a failure. Use the shared
   path in
   `../../qfai-implement/references/red-not-observable.md`: record `Satisfied-by`,
   mutate the production predicate the journey asserts on, run this row's test
   and confirm it fails, restore, and record `Falsifiability command` /
   `Falsifiability result` beside the GREEN pair. `qa-gatekeeper` accepts this
   form as the row's minimum evidence, and the row proceeds to `green` and
   `done` normally.

   **`Satisfied-by` takes whatever already implements the predicate.** The
   shared reference names a sibling `TDD-NNNN` because that is its usual case,
   but an ATDD surface often has none — a pre-existing route, or one this cycle
   built outside the ledger. Record what actually satisfies it: a `TDD-NNNN`
   when there is one, otherwise the production path and symbol
   (`src/api/routes/evaluations.py::register`) or the commit that added it. What
   the field has to answer is "what would I mutate to falsify this row", and a
   path answers it as well as a row id does.

3. **Neither is possible.** Only then is the row an `exception`, with a `DR-*`
   naming what made both branches unavailable. An obligation with no persisted
   form, or one genuinely unobservable at L5, belongs here — but "the surface
   was built first in this same cycle" does not, because branch 1 or 2 covers
   it.

Branch 3 is the last resort, not the default. A stage that routes every row it
owns to `exception` has not measured anything; it has recorded that it did not
try branches 1 and 2.

## Evidence shape

Exactly one form per row, never both and never neither:

| Branch         | Recorded                                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| Observed RED   | RED command+result, GREEN command+result                                      |
| Falsifiability | `Satisfied-by`, `Falsifiability command`, `Falsifiability result`, GREEN pair |
| `exception`    | `DR-*`, and why both other branches were unavailable                          |

The `Evidence` cell is a pointer; the payload lives in
`.qfai/evidence/atdd-<spec-id>.md` under `## Ledger rows advanced`
(`../../qfai-implement/references/execution-ledger.md#evidence-cell-encoding`).
