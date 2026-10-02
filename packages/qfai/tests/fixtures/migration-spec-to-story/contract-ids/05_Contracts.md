# 05 Contracts

## Purpose

- Keep contracts as SSOT under `.qfai/contracts/**` with deterministic IDs.

## Contract Index

### DB Contracts

1 item

| Short ID | Entity        | Declared ID | File                                    | Depends On | Reconciled With | Purpose      |
| -------- | ------------- | ----------- | --------------------------------------- | ---------- | --------------- | ------------ |
| DB-001   | Order storage | CON-DB-0001 | `.qfai/contracts/db/db-0001-orders.sql` | -          | CON-API-0001    | Store orders |

### API Contracts

1 item

| Short ID | Router  | Declared ID  | File                                       | Depends On  | Reconciled With | Purpose       |
| -------- | ------- | ------------ | ------------------------------------------ | ----------- | --------------- | ------------- |
| API-001  | /orders | CON-API-0001 | `.qfai/contracts/api/api-0001-orders.yaml` | CON-DB-0001 | CON-DB-0001     | Accept orders |

## Mapping Rules

- `Depends On` lists the contracts applied before this one.
