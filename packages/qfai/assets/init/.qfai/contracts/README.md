# contracts

## Purpose

Contracts define the **stable surface** that specs and tests may reference.
They are the boundary between "what we promise" and "how we implement".

QFAI organizes contracts into four directories:

```text
contracts/
├── api/      # OpenAPI YAML (endpoints, request/response)
├── db/       # SQL schema contracts (tables, columns, constraints)
├── design/   # Design token YAML — optional supporting input
└── ui/       # UI contract YAML (screens, elements, user actions)
```

> **Note:** `ui/` and `design/` are **supporting input** that supplements the discussion sidecar artifacts (`discussion-*/uiux/*`), which remain the primary truth. After `qfai init`, these directories may contain only placeholder READMEs — this is the normal initial state.

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
├── design/
│   ├── README.md
│   └── design-tokens.yaml          (created when needed)
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
