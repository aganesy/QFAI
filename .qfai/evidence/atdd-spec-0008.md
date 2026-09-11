# ATDD Evidence: spec-0008

## Objective

Give `spec-0008`'s two `Integration` ledger rows the evidence entry their `Evidence`
cell points at. Both rows are at `done` and both carried prose — `RED→GREEN 2026-06-01
(W4 c1acb533); reviewers PASS×3; REQ-0157` — written before the cell became a pointer.
That prose is why the pack reported `QFAI-TDDLIST-007` and `QFAI-TDDLIST-011` twice each.

No coverage claim changes here. Both rows were already `done` and stay `done`; what is
added is the record their cells were always supposed to name.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0008/tdd/test-list.md` — the two rows, their `Layer`, `Test file`,
  `Selector` and `TC-Refs`
- `.qfai/specs/spec-0008/06_Test-Cases.md` — `TC-0008-0013`, `TC-0008-0014`
- `packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts`
- `packages/qfai/tests/integration/atddScaffoldEscalation.test.ts`
- `packages/qfai/src/core/atdd/scaffoldDialect.ts`,
  `packages/qfai/src/core/atdd/scaffoldEscalation.ts` — the units the two oracles were
  established against
- `.qfai/assistant/skills/qfai-implement/references/execution-ledger.md` — the cell
  grammar, and the backfill shape a row whose run output is gone is recorded in

## Decisions made (with rationale)

### The original runs are not reproducible, and that is what is recorded

The cells name a run on 2026-06-01 at `c1acb533`, with three reviewer passes. No evidence
file was written for it, and no review pack from it survives. `execution-ledger.md`
covers exactly this: where the run is gone, the loss is itself the thing to record.

Both entries therefore declare `Run output retained: no`. That drops the reviewer-pack
and seal fields, which certify artifacts that do not exist and must not be invented, and
keeps everything a re-run produces.

**The reviews are not disclaimed.** The cells record `reviewers PASS×3`, and that stands.
What is gone is the means to verify it from artifacts, which is what `QFAI-TDDLIST-019`
reports against these two rows.

### `RED:falsifiability`, not `RED:fail`

`RED:fail` claims the test was observed failing before the code existed. That is not what
happened here: the implementation is present, and the RED leg was re-established by
mutating it. `falsifiability` is the token for a test shown capable of failing, so it is
the one these cells carry.

### `TC-0008-0013` gets `equivalent-mutant`, `TC-0008-0014` gets `proved`

The two differ, and the difference is measured below rather than assumed. `TC-0008-0014`
reads a boundary three separate ways, so moving the boundary kills it. `TC-0008-0013`
asserts the marker is present in the emitted body, and the body writes that marker at two
sites — so mutating one site alone leaves the test green. That is a real oracle ceiling,
and naming it `proved` would overstate what the test holds.

## Work performed (what changed, where)

- **new** this file — the two entries below
- `.qfai/specs/spec-0008/tdd/test-list.md` — the two `Evidence` cells rewritten from
  prose to the pointer grammar. No other column changed on either row.

No source file changed. Every mutation below was reverted and the revert verified by a
clean `git diff` before the next step.

## Commands executed + key outputs

Revision `6e3133dbae46e95b869eae35160c61386db06252` throughout.

### TC-0008-0013 — `atddScaffoldSkeleton.test.ts`

```text
vitest run --project integration tests/integration/atddScaffoldSkeleton.test.ts
  13 passed (13)
```

Killing mutation — both `// TODO: implement assertion for ${tcId}` sites in
`scaffoldDialect.ts#buildBody` (JS/TS dialect) stripped of the `TODO:` prefix:

```text
  1 failed | 12 passed (13)
  × TC-0008-0013 — emits one skeleton file per TC with framework import,
    TODO marker, and per-TC annotation (normal)
```

Oracle ceiling, measured — the **first** site alone stripped, the second left intact:

```text
  13 passed (13)
```

The test asserts the marker is present in the body, not that it is present at both sites.
Hence `ORACLE:equivalent-mutant`.

### TC-0008-0014 — `atddScaffoldEscalation.test.ts`

```text
vitest run --project integration tests/integration/atddScaffoldEscalation.test.ts
  8 passed (8)
```

Killing mutation — `shouldEscalate`'s `attempts >= threshold` weakened to
`attempts > threshold`:

```text
  3 failed | 5 passed (8)
  × TC-0008-0014 — shouldEscalate returns false below threshold and true at/above threshold
  × TC-0008-0014 — running scaffold 3 times against an unprogressed placeholder triggers
    an escalation warning naming the TC (error)
  × TC-0008-0014 — escalation threshold is configurable via
    qfai.config.yaml#atdd.scaffoldEscalateCycles (special)
```

Three independent cases read the at-threshold boundary, so the mutant is killed rather
than tolerated. Hence `ORACLE:proved`.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0008.md` (committed). Totals by `Status`:
**✅ 1 / ⚠️ 0 / ❌ 0** for `TC-0008-0014` and **⚠️** for `TC-0008-0013`, so
**✅ 1 / ⚠️ 1 / ❌ 0** over the two rows. Across the fourteen depth cells:
**✅ 9 / ⚠️ 3 / ❌ 2**.

The two `❌` cells are both `TC-0008-0013`'s — its error path and its combinatorial
depth — and the matrix names what is absent in each rather than scoring it low without
saying why. `TC-0008-0013`'s `⚠️` on oracle strength is the same ceiling the entry below
records as `ORACLE:equivalent-mutant`, so the two cannot disagree.

## Entries

### TDD-0013

- TDD-ID: TDD-0013
- Layer: integration
- Test file: packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts
- Selector: TC-0008-0013: scaffold emits per-TC skeleton with TODO + Refs (US/AC/TC)
- TC-ref: TC-0008-0013
- Round 1: Revision: 6e3133dbae46e95b869eae35160c61386db06252
- Round 1: RED revision: 6e3133dbae46e95b869eae35160c61386db06252
- Round 1: RED test manifest: packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: RED test hash: 2dee31345505f7d2554b7e61d2434fc5779173dc6c0b51f87dac83c1d1994642
- RED failure mode: assertion
- Round 1: RED command: vitest run --project integration tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: RED result: 1 failed | 12 passed
- Round 1: GREEN command: vitest run --project integration tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: GREEN result: 13 passed
- Oracle proof: equivalent-mutant — the body writes the TODO marker at two sites and the test asserts its presence in the body, so stripping the first site alone leaves all 13 green
- Refactor verify command: vitest run --project integration tests/integration/atddScaffoldSkeleton.test.ts
- Refactor verify result: 13 passed
- Checkpoint verification command: node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec 0008
- Checkpoint verification result: PASS
- Run output retained: no
- Backfill note: the 2026-06-01 run at c1acb533 recorded three reviewer passes and left no evidence file or review pack. Re-run and re-falsified at 6e3133d; the reviewer verdicts stand on the ledger but cannot be verified from artifacts.

### TDD-0014

- TDD-ID: TDD-0014
- Layer: integration
- Test file: packages/qfai/tests/integration/atddScaffoldEscalation.test.ts
- Selector: TC-0008-0014: scaffold idempotency + 3-cycle escalation (atdd.scaffoldEscalateCycles)
- TC-ref: TC-0008-0014
- Round 1: Revision: 6e3133dbae46e95b869eae35160c61386db06252
- Round 1: RED revision: 6e3133dbae46e95b869eae35160c61386db06252
- Round 1: RED test manifest: packages/qfai/tests/integration/atddScaffoldEscalation.test.ts
- Round 1: RED test hash: 02616ec8c9f1724ceae8e15d5b095fdb671440d773e630f66172ba8b265019a9
- RED failure mode: assertion
- Round 1: RED command: vitest run --project integration tests/integration/atddScaffoldEscalation.test.ts
- Round 1: RED result: 3 failed | 5 passed
- Round 1: GREEN command: vitest run --project integration tests/integration/atddScaffoldEscalation.test.ts
- Round 1: GREEN result: 8 passed
- Oracle proof: proved — `shouldEscalate`'s `attempts >= threshold` weakened to `attempts > threshold`, then `vitest run --project integration tests/integration/atddScaffoldEscalation.test.ts` produced `3 failed | 5 passed (8)`, killing the mutant on the row's own Selector `TC-0008-0014: scaffold idempotency + 3-cycle escalation (atdd.scaffoldEscalateCycles)` and on two siblings; the same command is this row's GREEN command and reports `8 passed` unmutated, so the discrimination is this test's and not another's
- Refactor verify command: vitest run --project integration tests/integration/atddScaffoldEscalation.test.ts
- Refactor verify result: 8 passed
- Checkpoint verification command: node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec 0008
- Checkpoint verification result: PASS
- Run output retained: no
- Backfill note: the 2026-06-01 run at c1acb533 recorded three reviewer passes and left no evidence file or review pack. Re-run and re-falsified at 6e3133d; the reviewer verdicts stand on the ledger but cannot be verified from artifacts.
