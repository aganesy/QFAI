# RED Provenance for an ATDD-owned Ledger Row

`.qfai/specs/<spec-id>/tdd/test-list.md` is `/qfai-implement`'s execution
ledger, and `qfai-implement/SKILL.md` states the split: **`Layer = E2E` and
`Layer = API` rows are tracked there, but their tests are authored here.** This
skill therefore writes into a ledger whose status lifecycle it does not define.

## What this skill produces

- **Evidence, not ledger cells.** `/qfai-implement` writes `Status`, `DR-ID`
  and `Evidence` for every row — one writer, as
  `constitution/drift-protocol.md` grants it. This stage produces the evidence
  those cells point at, in `.qfai/evidence/atdd-<spec-id>.md` under
  `## Ledger rows advanced`, and hands it over.
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
      RED. Register the route — or the export the test imports — so it
      **resolves but does not satisfy the row's predicate**. This is the same
      step `/qfai-implement` Phase Red takes at 3a, for the same reason: without
      it the first failure of any new-surface row is a resolution error by
      construction.

      **The seam must not return the contracted status.** When the row's
      predicate _is_ the status — `201` on create, `204` on delete, `403` on a
      refusal — a handler registered with "the declared status" passes the
      assertion the moment it exists, so there is no RED left to observe and the
      row's behaviour was implemented before its test failed, which is what
      branch 1 exists to prevent. Answer with a not-implemented sentinel the
      contract does not use (`501`, or `500` from an explicit
      `NotImplementedError`) and an empty body. Routing resolves, the status
      assertion fails on the predicate the row owns, and the RED is admissible.
      If the contract genuinely uses that sentinel too, pick another status
      outside its declared set — the requirement is that no assertion in this
      row's selector can pass against the seam.

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

   **The row still moves `todo -> red -> green`.** Falsifiability _is_ the RED
   for this row — `red-not-observable.md` says so for its own case and
   `qa-gatekeeper` accepts it as the row's minimum evidence — so the mutation
   run satisfies `todo -> red` and the restored passing run is the GREEN. There
   is no `todo -> green` edge and none is needed. Hand the pair over in that
   order, so `/qfai-implement` writes the same two transitions it writes for
   any other row.

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
| Observed RED   | RED command+result, GREEN command+result, `Oracle proof`                      |
| Falsifiability | `Satisfied-by`, `Falsifiability command`, `Falsifiability result`, GREEN pair |
| `exception`    | `DR-*`, and why both other branches were unavailable                          |

**Where each form lives.** The `## Ledger rows advanced` table is an index: one
row per `TDD-*`, holding the branch and an anchor. The commands and their output
go in that row's own `### TDD-NNNN` section, in fenced blocks. They cannot go in
a table cell: a GFM row is one physical line and a cell ends at every unescaped
`|`, so a multi-line run, a shell pipe or a regex alternation in the output
either truncates the proof or breaks every row below it
(`../../qfai-implement/references/execution-ledger.md#evidence-cell-contract`).

`qa-gatekeeper` requires an `Oracle proof` on **every** item — a named
production mutation that makes the test fail, or a recorded `equivalent-mutant`
— because a passing run does not show the test depends on the behaviour the row
owns. A natural RED is not a substitute: it shows the test failed before the
code existed, not that it discriminates once the code does. Branch 2 satisfies
this with the mutation it already performs; branch 1 records one explicitly.
Criteria: `../../qfai-implement/references/oracle-strength.md`.

The `Evidence` cell is a pointer; the payload lives in
`.qfai/evidence/atdd-<spec-id>.md` under `## Ledger rows advanced`
(`../../qfai-implement/references/execution-ledger.md#evidence-cell-encoding`).

## Handover to /qfai-implement

`/qfai-implement` Phase Red step 3b routes an `E2E` / `API` row here instead of
through its own steps 4 and 5. Those steps re-run the test and watch it fail —
but by the time that skill reaches the row, the surface exists, so the run
passes and step 5 classifies it as an anomaly bound for `exception`. That is the
terminal state branch 2 exists to avoid, reached through the branch itself.

Read the row's entry and take the branch it names:

| Branch           | What `/qfai-implement` does                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `observed-red`   | Verify the RED pair names this row's selector and the predicate it owns, write `todo -> red` from it, continue at Phase Green with the recorded GREEN pair. Do **not** re-run for a second RED.                          |
| `falsifiability` | Verify `Satisfied-by`, `Falsifiability command` and `Falsifiability result` are present and that the mutation names the predicate this row asserts on. The mutation run **is** `todo -> red`; the restored run is GREEN. |
| `exception`      | Accept the `DR-*` the stage recorded; do not re-derive it.                                                                                                                                                               |

If the entry is absent, malformed, or names no branch, `/qfai-implement` **stops
with a handoff note**. Inventing a RED for a test it did not author is a drift
violation, not a recovery.
