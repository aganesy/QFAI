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
`L3` is not. An obligation that spans two layers is two TC rows.

**`L4` and `L5` are not `TC-*` values.** An oracle that lands at the service
boundary (L4) or on a full-system journey (L5) is a misfiled obligation —
record it as `CON-API-*` or `US-*`, not as a `TC-*` row. If one is declared
anyway, the ATDD gate routes it to `<testsDir>/api/**` or `<testsDir>/e2e/**`
by its declared `Level`; that routing is a safety net, not a licence to file
L4/L5 as `TC-*`.

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

Which codes require a `tdd/test-list.md` row is decided by
`isCoverageTargetLevel`. It recognises both spellings of every layer — the code
form (`L1`-`L5`) and the word form (`unit`, `integration`, `e2e`, …) — so `L1`
and `L2` are coverage targets that need a ledger row and `L3`-`L5` are not. A
value it recognises in neither spelling is conservatively treated as a target,
and `TDDLIST_UNKNOWN_LEVEL` reports it rather than letting it pass silently.

An **empty** cell is not that case: it declares nothing, so the TC gets no
ledger row and `QFAI-ATDD-112` owns it from `<testsDir>/integration/**` like any
other TC with no declared `Level`. Declare a `Level` for every TC — leaving the
cell blank hands the TC to `/qfai-atdd`, which is rarely what a unit-level
oracle wants.

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
