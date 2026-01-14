# contracts/db/

Place **DB contracts** here as **SQL DDL files** (`.sql`).

## File naming
- `db-0001-<slug>.sql`  
  - Contract ID: `DB-0001` (4-digit fixed)

## Required header
Include the contract ID in the SQL header comments so QFAI can discover/index it:

```sql
-- QFAI-CONTRACT-ID: DB-0001
-- DB-0001 (short description)
```

## Guidelines
- Keep DB contracts minimal and spec-driven (only what scenarios/tests need).
- This directory is for the **contract/schema snapshot**, not migrations history.
- If your project uses an ORM schema (Prisma, etc.), decide one:
  - (Recommended for v1.0.6) Keep a minimal `.sql` contract snapshot here, and link to the real schema in the spec.
  - (Future) Add support for other schema formats via config (out of scope for v1.0.6).
