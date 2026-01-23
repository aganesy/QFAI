# contracts/db

## Purpose

Define minimal DB contracts that specs and scenarios may reference.

## File rules

- SQL files named `db-XXXX-<slug>.sql`
- Each file declares `QFAI-CONTRACT-ID` at the top
- Define only tables/columns used by specs

## Template (SQL)

```sql
-- QFAI-CONTRACT-ID: DB-0001
-- Purpose: <short summary>

CREATE TABLE <table_name> (
  <column_name> <type> NOT NULL
);
```

## Checklist

- [ ] QFAI-CONTRACT-ID is present at the top
- [ ] SQL is valid and minimal
- [ ] No ORM or runtime-specific settings are included
- [ ] Specs only reference IDs that exist here
