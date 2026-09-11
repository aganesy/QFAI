# ATDD Evidence: spec-0008

## Objective

Carry the proof for the two `done` rows of this spec's ledger whose `Evidence`
cells predate the pointer grammar. Both name a test that exists and passes. What
neither cell said is how the failing observation was obtained and how strong the
oracle is, and the original runs left no output behind.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0008/06_Test-Cases.md`
- `.qfai/specs/spec-0008/tdd/test-list.md`
- `packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts`
- `packages/qfai/tests/integration/atddScaffoldEscalation.test.ts`
- `packages/qfai/src/core/atdd/scaffoldDialect.ts`
- `packages/qfai/src/core/atdd/scaffoldEscalation.ts`

## Decisions made (with rationale)

Both rows declare `Run output retained: no`. Their original runs are dated
2026-06-01 and the output was not kept, so the reviewer verdicts and the pack
seals a completed entry normally carries cannot be recorded — and must not be,
because a seal for a review whose artifacts are gone is a false record rather
than a missing one.

Everything the exemption does not drop is reproducible, and was reproduced. Each
test was re-run for its GREEN, and a mutation was applied to the code that
satisfies the obligation to establish that the test discriminates. Neither row
can produce an observed RED — the implementation shipped long before this
record — so both take the falsifiability path, and the mutation run is what that
path asks for.

## Work performed (what changed, where)

- `.qfai/specs/spec-0008/tdd/test-list.md` — the `Evidence` cells of `TDD-0013`
  and `TDD-0014` rewritten as pointers into this file. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command below ran from `packages/qfai`. The clean-tree runs were taken at
revision `d3894bf642fbc66fb2455d3340da4de66f1b6063`. Each mutation was reverted
before the next run, from a copy of the pre-mutation bytes rather than re-typed,
and the tree was re-addressed after each revert to confirm it had returned to
the clean value.

| Run                          | Command                                                                                                 | Result                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `TDD-0013` GREEN             | `npx vitest run tests/integration/atddScaffoldSkeleton.test.ts`                                          | 13 passed                         |
| `TDD-0013` falsifiability    | `npx vitest run tests/integration/atddScaffoldSkeleton.test.ts`                                          | 1 failed, 12 passed               |
| `TDD-0014` GREEN             | `npx vitest run tests/integration/atddScaffoldEscalation.test.ts`                                        | 8 passed                          |
| `TDD-0014` falsifiability    | `npx vitest run tests/integration/atddScaffoldEscalation.test.ts`                                        | 3 failed, 5 passed                |
| Refactor verify (both rows)  | `npx vitest run tests/integration/atddScaffoldSkeleton.test.ts tests/integration/atddScaffoldEscalation.test.ts` | 21 passed                 |
| Checkpoint (both rows)       | `npx vitest run --project integration`                                                                  | 1397 passed, 19 not run           |

## Test volume estimate

Not applicable. This run authored no test; it records proof for two rows whose
tests already exist.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Ledger rows advanced

No row changed status. Both rows below were already `done`; this run supplies
the evidence their cells point at.

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0013` | `TC-0008-0013` | integration | falsifiability | done   |
| `TDD-0014` | `TC-0008-0014` | integration | falsifiability | done   |

### TDD-0013

- TDD-ID: TDD-0013
- Layer: integration
- Test file: packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts
- Selector: TC-0008-0013: scaffold emits per-TC skeleton with TODO + Refs (US/AC/TC)
- TC-ref: TC-0008-0013
- Run output retained: no
- Backfill note: the original cycle ran on 2026-06-01 and its output was not kept. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Round 1: Satisfied-by: packages/qfai/src/core/atdd/scaffoldDialect.ts, JS_TS_DIALECT.buildBody — the two lines that write the marker `// TODO: implement assertion for <TC>` into an emitted skeleton.
- Round 1: Falsifiability command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 12 passed (13). The failure is an assertion inside this row's own selector, on the marker the obligation names.
- Round 1: Falsifiability revision: working-tree+a70638bab00ced77542a68d7790dd2dd37d921f0c5072bce04bde5ab78297c59
- Round 1: GREEN command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 13 passed (13)
- Round 1: RED test hash: 2dee31345505f7d2554b7e61d2434fc5779173dc6c0b51f87dac83c1d1994642
- Round 1: RED test manifest: packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts

The mutation removed the `TODO:` prefix from **both** marker lines in the JS/TS
body.

**What the oracle does not cover.** Removing the prefix from one of the two
lines leaves the test green, and that was run rather than assumed. The
assertion reads each emitted body for one occurrence of the marker, and both
lines write it into every body, so either alone satisfies it. The oracle covers
the marker's presence and not its placement. That is the boundary a stronger
test would have to move, and it is recorded here rather than left for the next
reader to find.

- Refactor verify command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts tests/integration/atddScaffoldEscalation.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 21 passed (21)
- Refactor verify revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Checkpoint verification command: npx vitest run --project integration
- Checkpoint verification result: PASS — exit 0; Test Files 154 passed (158); Tests 1397 passed (1416)
- Checkpoint verification revision: d3894bf642fbc66fb2455d3340da4de66f1b6063

Four of that project's test files, carrying nineteen cases, declare themselves
inactive and did not run.

### TDD-0014

- TDD-ID: TDD-0014
- Layer: integration
- Test file: packages/qfai/tests/integration/atddScaffoldEscalation.test.ts
- Selector: TC-0008-0014: scaffold idempotency + 3-cycle escalation (atdd.scaffoldEscalateCycles)
- TC-ref: TC-0008-0014
- Run output retained: no
- Backfill note: the original cycle ran on 2026-06-01 and its output was not kept. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Round 1: Satisfied-by: packages/qfai/src/core/atdd/scaffoldEscalation.ts, shouldEscalate — the at-threshold comparison the obligation's third cycle turns on.
- Round 1: Falsifiability command: npx vitest run tests/integration/atddScaffoldEscalation.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 3 failed, 5 passed (8). All three failures are assertions inside this row's own selector.
- Round 1: Falsifiability revision: working-tree+b4b29ebebaaf5fdb346e5bc96661f30ab4532e29af3ba70890a74976bc6ee0f6
- Round 1: GREEN command: npx vitest run tests/integration/atddScaffoldEscalation.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 8 passed (8)
- Round 1: RED test hash: 02616ec8c9f1724ceae8e15d5b095fdb671440d773e630f66172ba8b265019a9
- Round 1: RED test manifest: packages/qfai/tests/integration/atddScaffoldEscalation.test.ts

The mutation changed the comparison from at-threshold to above-threshold. Three
cases die, which is what the obligation's shape predicts: the at-threshold case,
the configurable-threshold case and the escalation-warning case all read that
boundary, and the last two fail on an empty warning rather than a wrong count.

- Refactor verify command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts tests/integration/atddScaffoldEscalation.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 21 passed (21)
- Refactor verify revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Checkpoint verification command: npx vitest run --project integration
- Checkpoint verification result: PASS — exit 0; Test Files 154 passed (158); Tests 1397 passed (1416)
- Checkpoint verification revision: d3894bf642fbc66fb2455d3340da4de66f1b6063

Four of that project's test files, carrying nineteen cases, declare themselves
inactive and did not run.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0008.md`.
Totals: ✅ 35 / ⚠️ 11 / ❌ 116 across the nine depth columns of eighteen rows,
and ✅ 8 / ⚠️ 14 / ❌ 7 with 7 not applicable across the twelve business rules.

## Work Orders Summary

| Role                | Task                                                | Status (PASS/REVISE/PENDING) |
| ------------------- | --------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the eighteen obligations and write the matrix | PASS                         |
| completion-reviewer | Audit the matrix against the depth checklist        | PASS                         |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

- `TDD-0013`'s oracle covers the marker's presence and not its placement. The
  boundary is stated in that row's section.
- Twelve of the spec's other rows are parked at `exception`, and two of those
  cite `DR-0008-0100`, which no decision record declares. Out of scope here:
  this run advanced no row's status.

## Final status

PASS. Both rows carry the evidence their pointers name.
