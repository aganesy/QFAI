# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Ensure test cases cover not only normal paths but also error paths, boundary values, and edge cases.

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

**`L4` and `L5` are not `TC-*` values.** The ATDD gate routes an obligation by
its ID, not by `Level`: a `TC-*` is answered from `tests/integration/**`, and a
`TC-*` reference inside `tests/api/**` or `tests/e2e/**` is rejected. An oracle
that lands at the service boundary (L4) or on a full-system journey (L5) is a
misfiled obligation — record it as `CON-API-*` or `US-*`, not as a `TC-*` row.

## Test Case Table (required)

| TC-ID   | Level | AC-Refs | EX-Ref  | Type     | Steps   | Expected   | Notes   |
| ------- | ----- | ------- | ------- | -------- | ------- | ---------- | ------- |
| TC-0001 | L2    | AC-0001 | EX-0001 | normal   | <steps> | <expected> | <notes> |
| TC-0002 | L2    | AC-0001 | —       | error    | <steps> | <expected> | <notes> |
| TC-0003 | L2    | AC-0001 | —       | boundary | <steps> | <expected> | <notes> |

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
