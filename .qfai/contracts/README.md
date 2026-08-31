# .qfai/contracts (downstream truth)

## Purpose

This directory holds the version-managed artifacts that downstream execution skills consume.

- **Contracts** (`api/`, `db/`, `ui/`) define the **stable surface** that
  specs and tests may reference. Each contract file requires a
  `QFAI-CONTRACT-ID` header and participates in the traceability ledger.
- **Design definitions** (`design/`) hold downstream-ready design inputs that
  `/qfai-sdd` normalizes from discussion-side exploration. They are
  version-managed and may be consumed directly by `/qfai-prototyping`,
  `/qfai-implement`, and `/qfai-atdd`.

QFAI organizes this directory into five subdirectories:

```text
.qfai/contracts/
├── api/      # OpenAPI YAML (endpoints, request/response)
├── cli/      # QFAI's own CLI / shipped-surface contracts (Markdown)
├── db/       # SQL schema contracts (tables, columns, constraints)
├── design/   # Exploration brief / rubric / selected direction / design system YAML
└── ui/       # UI contract YAML (screens, elements, user actions)
```

`cli/` holds the contracts for QFAI's own command surface and for the files
QFAI writes into a consuming project. Its entries are indexed in
`_policies/05_Contracts.md` under **CLI Contracts** with `CLI-*` short IDs.
They are Markdown, carry no `QFAI-CONTRACT-ID`, and are not scanned by the
`ui/` / `api/` / `db/` contract validators. Subject-named files (rather than
`qfai-<command>.md`) hold a schema or ownership boundary shared by more than one
command — `worklog-entry.schema.md`, `shipped-workflows.md`.

> **Note:** Discussion-pack UIUX files are upstream discovery artifacts. `/qfai-sdd` is responsible for normalizing the approved design/system/screen decisions into `.qfai/contracts/**`. Downstream execution skills must read these contracts instead of reading `discussion-*/uiux/*` directly.

## Directory rules

- Contract files are **minimal**: only what specs actually need.
- Each contract file in `api/`, `db/`, and `ui/` must declare `QFAI-CONTRACT-ID` at the top (`CON-UI-*` / `CON-API-*` / `CON-DB-*`).
- `design/` files are version-managed downstream inputs. They do not require `QFAI-CONTRACT-ID`, but they are part of the execution-time SSOT.
- Prefer additive changes; breaking changes require delta notes.

```text
.qfai/contracts/
├── README.md
├── api/
│   ├── README.md
│   └── api-0001-<slug>.yaml
├── cli/
│   ├── qfai-<command>.md
│   └── <subject>.md                 (shared schema / ownership boundary)
├── db/
│   ├── README.md
│   └── db-0001-<slug>.sql
├── design/
│   ├── README.md
│   ├── exploration-brief.yaml
│   ├── evaluation-rubric.yaml
│   ├── evaluator-calibration.yaml
│   ├── selected-direction.yaml
│   ├── design-system.yaml
│   └── design-tokens.yaml          (optional)
└── ui/
    ├── README.md
    └── ui-0001-<slug>.yaml
```

## How contracts relate to specs

- Traceability Ledger (`16_Traceability-ledger.md`) references contracts via `con_ids`.
- Layered overlays (`09_Examples.feature`, `11_Contracts.md`) may also reference contracts.
- `11_Contracts.md` is an index layer and must not become behavior SSOT.
- Discussion packs may explain where a contract came from, but they are not downstream execution inputs.

## Checklist

- [ ] Contract IDs exist and are unique.
- [ ] Contracts match what specs reference (no missing IDs).
- [ ] Contracts/design files are sufficient for downstream skills without discussion-pack fallback.
