# contracts/db (SQL)

## Purpose

Define DB schema contracts that specs, tests, and prototyping can reference.

## File rules

- File name: `db-XXXX-<slug>.sql`
- Header comment: `-- QFAI-CONTRACT-ID: DB-XXXX`
- Prefer explicit constraints (PK/UK/FK) when rules depend on them.

## Template (SQL)

```sql
-- QFAI-CONTRACT-ID: DB-0001
-- Purpose: <short>

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Checklist

- [ ] Contract ID exists and matches file name.
- [ ] Constraints reflect business rules (e.g., uniqueness).
- [ ] Minimal tables/columns only.
