# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Ensure test cases cover not only normal paths but also error paths, boundary values, and edge cases.

## Test Case Table (required)

| TC-ID   | Level | AC-Refs | EX-Ref  | Type     | Steps   | Expected   | Notes   |
| ------- | ----- | ------- | ------- | -------- | ------- | ---------- | ------- |
| TC-0001 | L2    | AC-0001 | EX-0001 | normal   | <steps> | <expected> | <notes> |
| TC-0002 | L2    | AC-0001 | —       | error    | <steps> | <expected> | <notes> |
| TC-0003 | L2    | AC-0001 | —       | boundary | <steps> | <expected> | <notes> |

### Level column values

The layer this test case verifies. Defined in
`.qfai/assistant/catalog/test-layers.md`; exactly one code per cell.

- `L1` — Unit. The oracle observes inputs and return values only.
- `L2` — Component. The oracle observes collaboration with a port through a
  fixture adapter, with no real infrastructure.
- `L3` — Integration. The oracle observes real infrastructure state
  (DB / queue / filesystem). Tests live in `tests/integration/**`.
- `L4` — API. The oracle observes service-boundary values (status, body, auth,
  error contracts). Tests live in `tests/api/**`.
- `L5` — E2E. The oracle observes a full-system journey. Tests live in
  `tests/e2e/**`.

`L1` and `L2` are TDD coverage targets: each such TC needs a
`tdd/test-list.md` row, enforced by `TDDLIST_TC_NOT_COVERED` at `error`
severity. `L3`-`L5` do not.

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
