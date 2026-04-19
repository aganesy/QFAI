# .qfai/contracts (contracts + supporting inputs)

## Purpose

This directory holds two related categories of inputs:

- **Contracts** (`api/`, `db/`, `ui/`) define the **stable surface** that
  specs and tests may reference. Each contract file requires a
  `QFAI-CONTRACT-ID` header and participates in the traceability ledger.
- **Supporting inputs** (`design/`) supplement contracts — they do **not**
  carry contract IDs and are not directly cited by specs. Design tokens are
  referenced indirectly from `ui/*.yaml` via token IDs.

QFAI organizes this directory into four subdirectories:

```text
.qfai/contracts/
├── api/      # OpenAPI YAML (endpoints, request/response)
├── db/       # SQL schema contracts (tables, columns, constraints)
├── design/   # Design token YAML — optional supporting input
└── ui/       # UI contract YAML (screens, elements, user actions)
```

> **Note:** `ui/` is a contract (QFAI-CONTRACT-ID required, cited by specs), but the **primary truth** for UI/UX definitions still lives in the discussion sidecar artifacts (`discussion-*/uiux/*`). UI contracts cite sidecar content by ID and exist specifically to make that sidecar machine-consumable for prototyping and selectors. `design/` is supporting input only (design tokens referenced indirectly from `ui/*.yaml`). After `qfai init`, these directories may contain only placeholder READMEs — this is the normal initial state.

## Directory rules

- Contract files are **minimal**: only what specs actually need.
- Each contract file in `api/`, `db/`, and `ui/` must declare `QFAI-CONTRACT-ID` at the top (`CON-UI-*` / `CON-API-*` / `CON-DB-*`).
- `design/` (design token YAML) is a supporting input — **not** a contract in the traceability ledger. It does not require a `QFAI-CONTRACT-ID` header and is referenced indirectly from `ui/*.yaml` contracts via token IDs.
- Prefer additive changes; breaking changes require delta notes.

```text
.qfai/contracts/
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
