# 05 Contracts

## Purpose

- Keep contracts as SSOT under `.qfai/contracts/**` with deterministic IDs.
- Use this file as a readable policy-layer index with short IDs for planning and review.

## Contract Index

### DB Contracts

0 items

<!-- Example row (remove this comment block and add real rows when contracts exist):
| DB-001   | order_drafts | CON-DB-0001 | `.qfai/contracts/db/db-0001-<slug>.sql` | draft persistence |
-->

| Short ID | Entity | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

### API Contracts

0 items

<!-- Example row:
| API-001  | /api/orders | CON-API-0001 | `.qfai/contracts/api/api-0001-<slug>.yaml` | create draft |
-->

| Short ID | Router | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

### UI Contracts

0 items

<!-- Example row:
| UI-001   | order-create | CON-UI-0001 | `.qfai/contracts/ui/ui-0001-<slug>.yaml` | draft input form |
-->

| Short ID | Screen | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

## Mapping Rules

- If no contracts are needed, keep each table and state `0 items` explicitly.
- `<slug>` must be kebab-case from entity/router/screen.

<!-- Example mappings (add when contracts exist):
- `DB-001` maps to `CON-DB-0001`, file `db-0001-<slug>.sql`.
- `API-001` maps to `CON-API-0001`, file `api-0001-<slug>.yaml`.
- `UI-001` maps to `CON-UI-0001`, file `ui-0001-<slug>.yaml`.
-->

## Diagram (Mermaid required for ER/relationship)

```mermaid
erDiagram
  ENTITY_A ||--o{ ENTITY_B : relates
  ENTITY_A {
    string id
    string key
  }
  ENTITY_B {
    string id
    string entity_a_id
    string state
  }
```
