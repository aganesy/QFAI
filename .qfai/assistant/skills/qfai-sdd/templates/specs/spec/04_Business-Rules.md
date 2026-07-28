# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Reference Column Conventions

- `AC-Refs`, `NFR-Refs` and `Contract-Refs` are typed reference columns. Each
  holds a comma-separated list of IDs and nothing else — no prose, no
  parentheses, no trailing commentary.
- `Contract-Refs` holds the contract IDs this rule is bound by:
  `CON-API-0001`, `CON-DB-0002`, `CON-EVT-0003`, … Use `-` when the rule binds
  no contract. Do not put contract IDs in `Notes`.
- `Notes` is free prose. IDs written there are **not** traced by any tool and
  must not be the only place an obligation is recorded.

## Rule Table (required)

| BR-ID   | Title   | AC-Refs | Rule   | Contract-Refs | Notes   | NFR-Refs |
| ------- | ------- | ------- | ------ | ------------- | ------- | -------- |
| BR-0001 | <title> | AC-0001 | <rule> | CON-API-0001  | <notes> | <nfr>    |
