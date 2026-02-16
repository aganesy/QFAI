# 10 Test Cases

## Coverage Matrix (EX -> TC)

| EX ID   | Related BR | Related AC | Linked TC IDs |
| ------- | ---------- | ---------- | ------------- |
| EX-0001 | BR-0001    | AC-0001    | TC-0001       |

## Cases

| TC ID   | Related AC | Related EX | Layer | Target location |
| ------- | ---------- | ---------- | ----- | --------------- |
| TC-0001 | AC-0001    | EX-0001    | api   | <path/to/test>  |

## Automated vs Manual

| TC ID   | Mode      | Why |
| ------- | --------- | --- |
| TC-0001 | automated | <reason> |

## Test Level

| TC ID   | Level       | Notes |
| ------- | ----------- | ----- |
| TC-0001 | integration | <why this level> |

## Test Location and Command

| TC ID   | File path              | Command |
| ------- | ---------------------- | ------- |
| TC-0001 | tests/api/sample.test  | pnpm test -- sample.test |

## Non-functional Checks (optional)

| Check ID | Related TC | Type        | Method |
| -------- | ---------- | ----------- | ------ |
| NFR-0001 | TC-0001    | performance | <tool or method> |

## Rules

- Each AC should have at least one linked test case.
- Each EX should map to one or more TC IDs in Coverage Matrix.
- Keep layer tags consistent with test-layer policy.

## Reference Rule

- May reference AC and EX.
- Must not be used as source for upper-layer intent.
