# RED Not Observable (obligation already satisfied)

Handling for `Phase: Red` step 5 when a newly written test passes on its first
run.

## Classify first

- **Obligation already satisfied by an earlier `done` sibling row** — the new
  test exercises a predicate that row already made pass. The usual case when a
  BR binds several ACs to one common validator. **Not an anomaly** and does
  **not** go to `exception`. Follow the procedure below.
- **Or, on a `Layer = E2E` / `Layer = API` row handed over by `/qfai-atdd`,
  satisfied by production code no ledger row owns** — a pre-existing route, or
  one built outside the ledger. Same procedure, and `Satisfied-by` takes the
  path rather than a row id (step 1). Specific to those rows: their surfaces
  come from work orders that never appear in the ledger, which is not true of
  a `Unit` / `Component` / `Integration` row.
- **Or satisfied by pre-existing production state that no row and no work
  order created** — a regression guard over a property the system already had
  before this spec existed. **Not an anomaly** either: nothing built the
  property, so there is no sibling row to cite and no route to name, and a row
  pushed to `exception` because the field had no honest value is a
  classification failure rather than a defect in the row. `Satisfied-by` takes
  the artifact **and the property it already had** (step 1).
- **Anything else** — the test is wrong, the SUT is wrong, or the cause is
  unknown. Transition to `exception` and record the anomaly.

Never weaken a correct test until it fails in order to manufacture a RED.

## Falsifiability evidence

An honest GREEN from a sibling item is evidence the system works, not a defect.
The row still needs to be falsifiable, so substitute falsifiability evidence
for the natural RED and let the row proceed to `green` and `done`:

1. Record `Satisfied-by` — **the sibling `TDD-NNNN` whose implementation
   already satisfies this obligation**, or, on the two branches after it, the
   production path and symbol, or the artifact **plus the property it already
   had** — never the artifact alone, because a file name says nothing about
   what made the predicate true. A decision record id is accepted where the
   property was established by a decision rather than by code.

   **The production path and symbol** (`src/api/routes/evaluations.py::register`)
   **is accepted only on a `Layer = E2E` / `Layer = API` row handed over by
   `/qfai-atdd`** — path _and_ symbol, never a commit id on its own. A commit
   that touched several routes and a helper names no single predicate, so the
   Oracle Strength Check has no boundary to apply and would take a mutation
   anywhere inside it; `qa-gatekeeper` REVISEs that form for exactly this
   reason. A commit recorded alongside the symbol is provenance and is fine. Those surfaces routinely
   have no ledger row — a pre-existing route, or one built outside the ledger —
   so requiring a row id sent every one of them to `exception`, the terminal
   state this procedure exists to avoid. On a `Unit` / `Component` /
   `Integration` row it is **not** accepted: production code no ledger row owns
   is the "anything else" case above, and `qfai-implement/SKILL.md` Phase Red
   step 5 sends it to `exception`. Widening the field for every row would let
   an ordinary TDD row reach `done` with no production change and no sibling.

2. Break the shared predicate deliberately (inject a mutation), run this row's
   test, and confirm it **fails**. Record the command and its output as
   `Falsifiability command` / `Falsifiability result`.
3. Revert the mutation and confirm the test passes again. That run is the row's
   GREEN evidence.
4. A mutation-testing result covering the same predicate is an acceptable
   substitute for the **falsifiability demonstration** — step 2 and the revert
   half of step 3 — with the report standing in for `Falsifiability command` /
   `Falsifiability result`. It does **not** substitute for GREEN: the row still
   records a `GREEN command` / `GREEN result` from a run with the predicate
   intact, either the original passing run or an explicit re-run.

## The seam is not production code

When what satisfies the obligation is the **seam** — the interface the test
reaches through, an exported helper, a fixture builder — record it as the seam
and name it. Do not dress it as a production path: the seam exists for the
test, so citing it as production state claims the system does something it does
not. This recurs in every spec, which is why it is named here instead of being
re-derived by each author.

## Effect on the gates

The `Evidence` cell carries `Satisfied-by`, `Falsifiability command`,
`Falsifiability result` and the GREEN pair in place of a RED pair. The
11-point gate is all-conditions-required, so every item this path touches is
listed here — a substitute that only covered item 3 would still leave the row
unable to reach `done`.

- **Item 2 ("A failing test was added first")** is satisfied by adding the
  correct test first and proving it falsifiable by mutation. A test that
  passes on its first run because the predicate is already implemented is
  still test-first; the alternative — weakening it until it fails — is what
  the classification step forbids.
- **Item 3 ("RED was observed")** is satisfied by the falsifiability evidence.
- **Item 4 ("Minimal production code was written")** is **waived**: the
  `Satisfied-by` row already wrote it. Inventing an unrelated change to tick
  this box is worse than the gap it fills. `Phase: Green` step 1 likewise has
  nothing to write on this path and proceeds straight to running the test.
- **The per-item evidence contract** treats the RED pair and the
  falsifiability trio as **exclusive alternatives**: exactly one form is
  present, never both and never neither. `qa-gatekeeper` accepts the
  falsifiability form as the minimum evidence for this row.
- **The completion prohibition** "No RED fresh evidence exists for the item"
  does not apply to a row carrying falsifiability evidence.
- **The `FINAL CHECKLIST` Red and Green boxes** are ticked by this path's
  substitutes: the falsifiability trio for Red, and the observed pass with no
  new production code for Green.
- **`project_memory` and `constitution/workflow.md`** restate "fresh RED +
  GREEN evidence is mandatory per item"; both now carry this path's exception,
  so a run that reloads only its memory context does not re-impose the RED pair
  and force a fabricated failure.

Every other gate item is unchanged: GREEN must still be observed, refactor
must still be verified, and both blocking reviewers must still return PASS.
