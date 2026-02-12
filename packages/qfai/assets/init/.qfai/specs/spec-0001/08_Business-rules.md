# 08 Business Rules

## Rules

| BR ID   | Related AC | Rule                                                           |
| ------- | ---------- | -------------------------------------------------------------- |
| BR-0001 | AC-0001    | Draft status starts as `draft` at creation time                |
| BR-0002 | AC-0002    | Customer and item combination must be unique for active drafts |
| BR-0003 | AC-0003    | Duplicate failures must emit `DUPLICATE_ORDER_DRAFT`           |
