# contracts

## Purpose

Contracts define the **stable surface** that specs and tests may reference.
They are the boundary between "what we promise" and "how we implement".

QFAI organizes contracts into three types:

```text
contracts/
├── api/   # OpenAPI YAML (endpoints, request/response)
├── db/    # SQL schema contracts (tables, columns, constraints)
└── ui/    # UI contract YAML (screens, elements, user actions)
```

## Directory rules

- Contract files are **minimal**: only what specs actually need.
- Each contract file must declare `QFAI-CONTRACT-ID` at the top (`CON-UI-*` / `CON-API-*` / `CON-DB-*`).
- Prefer additive changes; breaking changes require delta notes.

```text
contracts/
├── README.md
├── api/
│   ├── README.md
│   └── api-0001-<slug>.yaml
├── db/
│   ├── README.md
│   └── db-0001-<slug>.sql
└── ui/
    ├── README.md
    └── ui-0001-<slug>.yaml
```

## How contracts relate to specs

- Traceability Ledger (`16_Traceability-ledger.md`) references contracts via `con_ids`.
- Layered overlays (`09_Examples.feature`, `11_Contracts.md`) may also reference contracts.
- `11_Contracts.md` is an index layer and must not become behavior SSOT.

## Checklist

- [ ] Contract IDs exist and are unique.
- [ ] Contracts match what specs reference (no missing IDs).
- [ ] Contracts are minimal but sufficient for prototyping and test automation.
