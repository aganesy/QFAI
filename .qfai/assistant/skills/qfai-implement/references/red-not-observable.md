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
- **Or, on a row resumed from `blocked`, satisfied by this row's own earlier
  round** — `blocked` is reachable from `green` and `refactor`
  (`execution-ledger.md#allowed-transitions`) and `blocked` -> `todo` restarts
  the cycle, so the fresh RED that resumption owes is re-run against production
  code **this row already wrote**. **Not an anomaly** and does **not** go to
  `exception`: without this case the edge the ledger deliberately widened would
  have no legal way back to `done`. Same procedure, and `Satisfied-by` takes
  this row's own row id and the round that satisfied it (step 1). **Only a row
  whose resumed round carries `Resumed-from-blocked`** (`round-evidence.md`)
  **naming a departure status whose round was closed by a GREEN pair** — that
  is, `green` or `refactor` — qualifies. A row that reached `todo` by an
  approved upstream reset has its retained GREEN withdrawn, not resumed; a row
  blocked at `todo` or `red` never wrote the GREEN this form points at. Both
  take the ordinary classification.
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
   already satisfies this obligation**, or, on the three branches after it, the
   production path and symbol, this row's own row id and round, or the artifact
   **plus the property it already had** — never the artifact alone, because a
   file name says nothing about what made the predicate true. A decision record
   id is accepted where the property was established by a decision rather than
   by code.

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

   **On a row resumed from `blocked` it is this row's own row id plus the round
   whose GREEN wrote the predicate** (`TDD-0007 round 1`) — the only case where
   `Satisfied-by` names the row itself, and it is open on every `Layer`. What a
   reviewer checks in place of the sibling is that **retained round block**:
   `round-evidence.md` keeps the rounds recorded before the block, so the GREEN
   that wrote the predicate is on record and the mutation has a named boundary.
   A row carrying no such round was never resumed from `blocked`, and this form
   is not open to it — which is why it does not reopen the "no production
   change and no sibling" hole the paragraph above closes.

   **The retained round is necessary and not sufficient**: it proves the row was
   once GREEN, not that it arrived at `todo` by a resumption. An approved
   upstream reset leaves the same retained round while **withdrawing** the work
   it records, so the qualifying evidence is `Round N: Resumed-from-blocked` on
   the round the resumption wrote into — the blocker and the departure status,
   persisted there precisely because `Blocked-By` is cleared by
   `blocked` -> `todo` (`round-evidence.md`). A reviewer reads that field, not
   the retained GREEN alone; absent it, a reset row claiming this form is
   REVISEd and takes the ordinary classification above.

   **On an `E2E` / `API` / `Integration` row the resumption reaches this
   procedure through steps 4 and 5, not through the handover.**
   `qfai-implement/SKILL.md` Phase Red step 3b consumes the `/qfai-atdd`
   provenance of a `todo` row and skips steps 4 and 5 — replaying it here would
   re-assert a RED observed on the pre-block tree and never take the fresh one
   the resumption owes, so 3b excludes a row whose `Resumed-from-blocked` names
   a departure status **other than `todo`** and sends it down the ordinary path.
   **A row blocked at `todo` is excluded from that exclusion**: `todo` is where
   the row waits for the handover, so a block taken there consumed nothing and
   3b verifies the entry as it does for any other `todo` row. Such a row wrote
   no round, so this procedure's self-reference is closed to it regardless.

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
