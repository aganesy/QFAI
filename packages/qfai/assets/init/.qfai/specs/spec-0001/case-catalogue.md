# Case Catalogue — SPEC-0001: Order draft creation

## Metadata

| Key     | Value      |
| ------- | ---------- |
| Spec ID | SPEC-0001  |
| Created | 2026-02-12 |
| Updated | 2026-02-12 |

## Cases by category

### Core flows

| Case           | Case title                     | Targets                    | Preconditions                            | Action                             | Expected result                           |
| -------------- | ------------------------------ | -------------------------- | ---------------------------------------- | ---------------------------------- | ----------------------------------------- |
| CASE-0001-0001 | Create draft succeeds          | AC-0001-0001, BR-0001-0001 | No existing draft for same customer/item | Submit valid customer and item     | Status 201 and response status is `draft` |
| CASE-0001-0002 | Reject duplicate draft         | AC-0001-0002, BR-0001-0002 | Existing draft for same customer/item    | Submit duplicate customer and item | Status 409 conflict                       |
| CASE-0001-0003 | Stable duplicate error payload | AC-0001-0003, BR-0001-0003 | Existing draft for same customer/item    | Submit duplicate customer and item | Error code is `DUPLICATE_ORDER_DRAFT`     |

## Saturation evidence

- Covers happy path, duplicate detection, and stable contract output.
