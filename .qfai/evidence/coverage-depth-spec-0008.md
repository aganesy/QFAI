# Coverage Depth Matrix — spec-0008

Depth of the ATDD-owned coverage `spec-0008` carries, scored per obligation across the
seven dimensions. Every cell below is read off a named test case in the file the row
owns; a dimension with no case reading it is `❌` rather than assumed.

## What the ATDD surface is for this spec

`spec-0008` owns two ATDD rows, both `Layer = integration`, so the obligation each one
answers is a `TC` rather than a `US`:

| Row      | Obligation     | Test file                                                        | Cases |
| -------- | -------------- | ---------------------------------------------------------------- | ----- |
| TDD-0013 | `TC-0008-0013` | `packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts`   | 13    |
| TDD-0014 | `TC-0008-0014` | `packages/qfai/tests/integration/atddScaffoldEscalation.test.ts` | 8     |

The pack's other twelve rows are at `exception` and own no ATDD obligation, so they are
outside this matrix.

## The matrix

| TC ID        | Normal path | Error path | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ----------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| TC-0008-0013 | ✅          | ❌         | ✅              | ✅             | ⚠️                | ❌            | ⚠️              | ⚠️     |
| TC-0008-0014 | ✅          | ✅         | ✅              | ✅             | ✅                | ⚠️            | ✅              | ✅     |

Totals by `Status`: **✅ 1 / ⚠️ 1 / ❌ 0**. Totals across the fourteen depth cells:
**✅ 9 / ⚠️ 3 / ❌ 2**.

## Every ❌ cell, named

Two, both on `TC-0008-0013`.

### TC-0008-0013 — Error path: ❌

No case exercises a failing scaffold. The eleven cases all describe a catalogue the
command can parse and a directory it can write to. Absent:

- a `06_Test-Cases.md` the parser cannot read;
- a `testsDir` that does not exist or cannot be written;
- a TC id that collides with a file already holding a real assertion.

The last of these is the one with teeth: the idempotency case proves the command leaves a
progressed file alone, but nothing proves what it does when the write itself fails
halfway. Until a case reads that, the row's error behaviour is unobserved rather than
known-good.

### TC-0008-0013 — Combinatorial: ❌

Every case varies one dimension. The catalogue-form cases hold `testsDir` at its default;
the `testsDir` case holds the catalogue at heading form; the `Level` cases hold both. No
case crosses two — a table-form catalogue under an overridden `testsDir` with a
no-`Level` TC is the shape an adopter most plausibly has, and it is not read here.

## Every ⚠️ cell, named

### TC-0008-0013 — State transitions: ⚠️

One transition is read: placeholder → progressed, by "re-running scaffold is idempotent:
no rewrite when a real assertion has replaced the placeholder". That is the transition
that matters most, and it is the only one. Progressed → reverted, and placeholder →
deleted, are not read.

### TC-0008-0013 — Oracle strength: ⚠️

Measured, not estimated. The emitted body writes the `TODO:` marker at two sites, and the
assertion reads its presence in the body — so stripping the first site alone leaves all
13 cases green. The oracle holds that a marker is emitted; it does not hold where.
Recorded as `ORACLE:equivalent-mutant` on the ledger cell for that reason.

### TC-0008-0014 — Combinatorial: ⚠️

Two cases genuinely cross dimensions — "increments interleaved across specs do not drop a
sibling's key" and "a reset concurrent with increments leaves the other counters intact"
each cross concurrency with multi-key state. Both hold the threshold at its default, so
the cross of a configured threshold with concurrent increments is not read.

## Why `TC-0008-0014` is ✅

Its eight cases read six of the seven dimensions directly, and the seventh partially:

| Dimension         | Case                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| Normal path       | escalation warning fires on the third unprogressed attempt, naming the TC    |
| Error path        | increments interleaved across specs do not drop a sibling's key              |
| Boundary values   | false below threshold, true at and above; 12 overlapping increments all land |
| Special values    | threshold configurable through `atdd.scaffoldEscalateCycles`                 |
| State transitions | counter resets once a real assertion replaces the skeleton                   |
| Oracle strength   | `proved` — weakening `>=` to `>` kills it on three independent cases         |

The at-threshold boundary is read three separate ways, which is what makes the oracle a
proof rather than a single observation.
