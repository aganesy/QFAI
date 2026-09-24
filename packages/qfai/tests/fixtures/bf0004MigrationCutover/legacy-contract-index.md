# Contracts

## Boundaries

The order API and order storage keep separate contracts.

## Contract Index

| Short ID | Entity        | Declared ID  | File            | Depends On | Reconciled With | Purpose          |
| -------- | ------------- | ------------ | --------------- | ---------- | --------------- | ---------------- |
| API-001  | Order API     | CON-API-0001 | api/order.yaml  | -          | -               | Accept orders    |
| DB-001   | Order storage | CON-DB-0001  | db/orders.sql   | -          | -               | Store orders     |
| DES-001  | Order screen  | -            | design/order.md | -          | -               | Show the receipt |
