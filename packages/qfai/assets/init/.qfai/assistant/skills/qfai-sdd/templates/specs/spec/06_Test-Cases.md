# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Ensure test cases cover not only normal paths but also error paths, boundary values, and edge cases.

Derive each row's `Level` with
`.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.
One oracle per TC; a multi-valued `Level` is illegal.

## Level vocabulary

`Level` holds exactly **one** layer code from the crosswalk in
`.qfai/assistant/catalog/test-layers.md#layer-vocabulary-crosswalk-normative`:

- `L1` — Unit
- `L2` — Component
- `L3` — Integration

(Deliberately a list, not a table: `collectTestCaseIds` and the TDD coverage
report both read `parseFirstMarkdownTable`, so the **Test Case Table below must
be the first markdown table in this file**. A table here would be parsed as the
TC table, find no `TC-ID` column, and silently disable `TDDLIST_TC_NOT_COVERED`
for the whole spec.)

`L1` and `L2` are TDD coverage targets — each needs a `tdd/test-list.md` row.
`L3` is not a coverage target, and still needs one: Phase 2b seeds it a
`Layer = Integration` row whose test `/qfai-atdd` authors. An obligation that
spans two layers is two TC rows.

**`L4` and `L5` are not `TC-*` values.** An oracle that lands at the service
boundary (L4) or on a full-system journey (L5) is a misfiled obligation —
record it as `CON-API-*` or `US-*`, not as a `TC-*` row. If one is declared
anyway, the ATDD gate routes it to `<testsDir>/api/**` or `<testsDir>/e2e/**`
by its declared `Level` and `QFAI-ATDD-128` reports the row at `info`; that
routing is a safety net, not a licence to file L4/L5 as `TC-*`.

One obligation fits neither target: a transport or deployment constraint — a
TLS floor, a redirect the platform terminates. It declares no operation, path
or body, so it is not an API contract, and nobody performs a handshake, so it
is not a user story. That one stays a `TC-*` at `L3` and says where it is
verified, under [Verified somewhere this repository cannot
reach](#verified-somewhere-this-repository-cannot-reach).

`<testsDir>` is `paths.testsDir` from `qfai.config.yaml` (default `tests`); the
traceability scan follows the configured value, so write the paths relative to
it rather than hard-coding a literal `tests/` prefix.

## Test Case Table (required)

| TC-ID   | Level | AC-Refs | EX-Ref  | Type     | Steps   | Expected   | Notes   |
| ------- | ----- | ------- | ------- | -------- | ------- | ---------- | ------- |
| TC-0001 | L2    | AC-0001 | EX-0001 | normal   | <steps> | <expected> | <notes> |
| TC-0002 | L2    | AC-0001 | —       | error    | <steps> | <expected> | <notes> |
| TC-0003 | L2    | AC-0001 | —       | boundary | <steps> | <expected> | <notes> |

### Level column values

The layer this test case verifies; exactly one code per cell. All five codes are
defined in `.qfai/assistant/catalog/test-layers.md`, which is the single source;
the summaries below are a reading aid, not a second definition.

- `L1` — Unit. The oracle observes inputs and return values only.
- `L2` — Component. The oracle observes collaboration with a port through a
  fixture adapter, with no real infrastructure.
- `L3` — Integration. The oracle observes real infrastructure state
  (DB / queue / filesystem). Tests live in `<testsDir>/integration/**`.
- `L4` — API. The oracle observes service-boundary values (status, body, auth,
  error contracts). Tests live in `<testsDir>/api/**`.
- `L5` — E2E. The oracle observes a full-system journey. Tests live in
  `<testsDir>/e2e/**`.

Which codes a **gate** requires a `tdd/test-list.md` row for is decided by
`isCoverageTargetLevel`. It recognises both spellings of every layer — the code
form (`L1`-`L5`) and the word form (`unit`, `integration`, `e2e`, …) — so `L1`
and `L2` are coverage targets whose missing row is an error and `L3`-`L5` are
not. A value it recognises in neither spelling is conservatively treated as a
target, and `TDDLIST_UNKNOWN_LEVEL` reports it rather than letting it pass
silently — as a `warning`, which a waiver may clear, so an unrecognised `Level`
is not stopped before Phase 2b has to route it.

Which codes **get** a row is wider than that: `L3` gets a `Layer = Integration`
row too, seeded by the same Phase 2b and ungated, because that row is what puts
the integration layer in the Red/Green/Refactor cycle. `L4` / `L5` get none —
they are misfiled as `TC-*` in the first place.

**Leave the cell blank — or spell it something these five codes do not name —
and the TC is routed as `L3`**, not as a coverage target: `QFAI-ATDD-112` reads
every `Level` it cannot resolve as `<testsDir>/integration/**`, so Phase 2b
seeds it a `Layer = Integration` row and `/qfai-atdd` writes its test. That
single row is also what `TDDLIST_TC_NOT_COVERED` counts, so the TC is owed
exactly once. Declare one of the five codes anyway — the routing is a fallback,
not a substitute for saying which layer the oracle observes.

A `TC-*` that enumerates several rejection reasons, a status-code matrix or
several independent state transitions gets **one row per boundary**, not one row
(`.qfai/assistant/skills/qfai-implement/references/selector-granularity.md`).
Writing it as several `TC-*` rows here is the clearer form.

An **empty** cell is not that case: it declares nothing, so the TC gets no
ledger row and `QFAI-ATDD-112` owns it from `<testsDir>/integration/**` like any
other TC with no declared `Level`. Declare a `Level` for every TC — leaving the
cell blank hands the TC to `/qfai-atdd`, which is rarely what a unit-level
oracle wants.

### Verified somewhere this repository cannot reach

Some acceptance criteria are true of the deployment rather than of the code — a
TLS floor, a redirect the platform terminates. No layer the annotation gate
routes to can observe them: an integration test never crosses TLS, and an E2E
test against a plaintext local server asserting it would be a lie.

A test case says so in **its own block**, not in the table:

```markdown
## TC-0004: the origin refuses TLS 1.1 and accepts 1.2

- Level: L3
- x-qfai-status: external
- x-qfai-verified-by: a scheduled probe asserts the handshake against the
  deployed origin (`.github/workflows/deployment-watchdog.yml`)
```

Two values, and the second one costs more:

| value      | means                                   | needs                    |
| ---------- | --------------------------------------- | ------------------------ |
| `planned`  | the test is not written yet             | nothing; remove it later |
| `external` | the obligation is met outside this tree | `x-qfai-verified-by`     |

`external` without `x-qfai-verified-by` suspends nothing: the obligation stands
and `QFAI-ATDD-127` reports it. The pointer is what makes this an exit rather
than a way to silence the gate — it puts the thing that actually checks the
obligation where the next reader will find it.

**Writing the block is the cost, and it is deliberate.** A marker cheap enough
to put in a table cell gets applied to every row that looks deployment-bound,
including the ones an in-process test could have covered all along. Lifting the
row out of the table is the moment to ask which kind this really is.

Neither value is a way to leave an obligation unmet. A test case that nothing
verifies anywhere belongs in neither state — and retiring the row instead walks
up `QFAI-COV-203` and `QFAI-COV-201` until the requirement itself is gone, which
is not the answer either.

### Type column values

- `normal` — Happy path / expected successful behavior.
- `error` — Error, failure, or invalid input path.
- `boundary` — Boundary value (min, max, just-outside-range).
- `edge` — Edge case (null, empty, concurrent, timing, max payload, etc.).

## Quality depth guideline

Each AC should have at minimum:

- One `normal` test case.
- One `error` or `boundary` test case.

If an AC has only `normal` type test cases, the test case set is considered incomplete.
Refer to `.qfai/assistant/skills/qfai-atdd/references/test-case-depth-checklist.md` for the full depth checklist.
