# contracts

## Purpose

Contracts define the **stable surface** that specs and tests may reference.
They are the boundary between “what we promise” and “how we implement”.

QFAI organizes contracts into three types:
- `api/` — OpenAPI YAML (endpoints, request/response)
- `db/` — SQL schema contracts (tables, columns, constraints)
- `ui/` — UI contract YAML (screens, elements, user actions)

## Directory rules

- Contract files are **minimal**: only what specs actually need.
- Each contract file must declare `QFAI-CONTRACT-ID` at the top.
- Prefer additive changes; breaking changes require delta notes.

```text
contracts/
  README.md
  api/
    README.md
    api-0001-<slug>.yaml
  db/
    README.md
    db-0001-<slug>.sql
  ui/
    README.md
    ui-0001-<slug>.yaml
```

## How contracts relate to specs

- `spec.md` and `scenario.feature` reference contracts via `QFAI-CONTRACT-REF`.
- Traceability must include “Contracts” in the chain table.

## Checklist

- [ ] Contract IDs exist and are unique.
- [ ] Contracts match what specs reference (no missing IDs).
- [ ] Contracts are minimal but sufficient for prototyping and test automation.
