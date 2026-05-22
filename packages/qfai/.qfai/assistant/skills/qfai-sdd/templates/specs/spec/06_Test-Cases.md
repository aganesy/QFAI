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
