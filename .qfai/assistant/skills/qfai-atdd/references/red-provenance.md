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
   1. **Ask `/qfai-implement` for the minimal seam first.** A test for a route
      that does not exist yet fails with a 404 or an import error, and that is a
      missing seam, not a RED — but the seam is production code, and this stage
      owns none: its `red` phase is `acceptance-test-engineer` and
      `qa-gatekeeper`, with no backend or frontend agent. Hand the row over for
      its Phase Red step 3a — register the route, or add the export the test
      imports, so it **resolves but does not satisfy the row's predicate** — and
      come back with the seam in place. Skipping it makes the first failure of
      any new-surface row a resolution error by construction; writing it here
      is the ownership breach step 5 exists to prevent.

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
      pair.
   3. **Get the row's scope approved by `delivery-planner` first.**
      `qfai-implement/SKILL.md` makes it the only authority on whether a
      selector covers a sufficient slice of its obligation, and requires a scope
      REVISE to be settled _before_ the RED is submitted. Approving the RED
      first leaves the planner nothing but "keep the PASS and open a new row",
      which cannot repair a handoff at the wrong granularity — the row has to be
      split before its RED is taken, not after.
   4. **Submit that run to `qa-gatekeeper` (routing phase `red`) before any
      production code exists, and wait for PASS.** `qfai-implement/SKILL.md`
      requires an independent reviewer to confirm the RED while the surface is
      still absent; a confirmation sought after it is built is post-hoc
      self-attestation of a state nobody can re-observe. Record the verdict
      beside the pair.
   5. **Stop there. Do not build the surface.** This skill owns acceptance
      tests, not production code — `agent-routing.yml` gives its implementation
      phase `acceptance-test-engineer` and no backend or frontend agent. The
      surface is built by `/qfai-implement` Phase Green from this handover, and
      the GREEN pair is recorded there. Branch 1's output is the RED pair, its
      `qa-gatekeeper` PASS, and the `Oracle proof` plan.

   Stage gate **P1b** is where steps 1-4 happen.

2. **Falsifiability (the surface is there and the test passes on its first
   run).** The usual shape when the surface predates this cycle, or this cycle
   built it before the journey was written — branch 1's seam step was not taken,
   or the work order sequenced surfaces first.

   **Run the test before choosing this branch.** Surface existence is not the
   condition; a first-run **pass** is. A surface that exists can still be wrong,
   and a correct test against a buggy one fails naturally — that is an observed
   RED, and the row belongs in branch 1: record the failure as its RED pair,
   hand the fix to `/qfai-implement` Phase Green, and take the GREEN from the
   corrected surface. Choosing branch 2 from existence alone sends a real,
   legitimately observed defect to `exception` or to a stop, because the
   mutation step cannot run against a test that is already failing and there is
   no GREEN to restore to.

   When it does pass: do **not** weaken it to manufacture a failure. Use the
   shared path in
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

| Branch         | Recorded                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Observed RED   | RED command+result, `qa-gatekeeper` PASS, the `Oracle proof` plan                                                |
| Falsifiability | `Satisfied-by`, `Falsifiability command`, `Falsifiability result`, GREEN pair                                    |
| `exception`    | Write `todo -> exception` with the `DR-*` the stage recorded; do not re-derive it, and do not enter Phase Green. |

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
this with the mutation it already performs; branch 1 names the mutation it
intends and `/qfai-implement` records the run at GREEN, when there is production
code to mutate.
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

| Branch           | What `/qfai-implement` does                                                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observed-red`   | Verify the RED pair names this row's selector and the predicate it owns and that `qa-gatekeeper` passed it, write `todo -> red` from it, then run Phase Green normally — the surface does not exist yet, and building it is this skill's work. Do **not** re-run for a second RED. |
| `falsifiability` | Verify `Satisfied-by`, `Falsifiability command` and `Falsifiability result` are present and that the mutation names the predicate this row asserts on. The mutation run **is** `todo -> red`; the restored run is GREEN.                                                           |
| `exception`      | Write `todo -> exception` with the `DR-*` the stage recorded; do not re-derive it, and do not enter Phase Green.                                                                                                                                                                   |

**A branch-2 row whose evidence is not written yet is deferred, not a stop.**
P1b fixes every row's branch; branch 2's mutation needs the surface, so it is
recorded at P6 — after the P1c handover. A `falsifiability` entry with its
branch named and its trio still empty therefore means "not yet", and
`/qfai-implement` leaves the row at `todo` and moves to the next one. Treating
it as a malformed handoff stops the whole run on the first such row, and if it
sits above a branch-1 row in the ledger the branch-1 row never reaches Phase
Green — so its test stays red, this stage cannot pass P5-P8, and P6 (where that
same branch-2 evidence would have been written) is never reached. The deadlock
is entirely inside the two skills' own sequencing.

If the entry is absent, names no branch, or is malformed in any other way, the
row **stays at `todo`** and `/qfai-implement` **stops with a handoff note**.
Writing `red` first and discovering the gap afterwards parks a `red` row with
no RED behind it; inventing one for a test it did not author is a drift
violation, not a recovery.
