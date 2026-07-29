# RED Not Observable (obligation already satisfied)

Handling for `Phase: Red` step 5 when a newly written test passes on its first
run.

## Classify first

- **Obligation already satisfied by a sibling row** — the new test exercises a
  predicate an earlier `done` row already made pass. This is the usual case
  when a BR binds several ACs to one common validator. It is **not an anomaly**
  and does **not** go to `exception`. Follow the procedure below.
- **Anything else** — the test is wrong, the SUT is wrong, or the cause is
  unknown. Transition to `exception` and record the anomaly.

Never weaken a correct test until it fails in order to manufacture a RED.

## Falsifiability evidence

An honest GREEN from a sibling item is evidence the system works, not a defect.
The row still needs to be falsifiable, so substitute falsifiability evidence
for the natural RED and let the row proceed to `green` and `done`:

1. Record `Satisfied-by: TDD-NNNN` — the row whose implementation already
   satisfies this obligation.
2. Break the shared predicate deliberately (inject a mutation), run this row's
   test, and confirm it **fails**. Record the command and its output as
   `Falsifiability command` / `Falsifiability result`.
3. Revert the mutation and confirm the test passes again. That run is the row's
   GREEN evidence.
4. A mutation-testing result covering the same predicate is an acceptable
   substitute for steps 2-3.

## Effect on the gates

The `Evidence` cell carries `Satisfied-by`, `Falsifiability command`,
`Falsifiability result` and the GREEN pair in place of a RED pair.

- Item 3 of the 11-point gate is satisfied by the falsifiability evidence.
- The completion prohibition "No RED fresh evidence exists for the item" does
  not apply to a row carrying it.
