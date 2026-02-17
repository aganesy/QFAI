# require

## Purpose

`require/` stores a mandatory require-pack that `/qfai-sdd` preflight depends on.

This directory is an intake package for requirement context.
Detailed design and implementation SSOT stay under `.qfai/specs/**`.

## Required structure

```text
require/
├── README.md
└── require-YYYYMMDDhhmmssSSS/
    ├── 01_Sources.md
    ├── 02_Scope.md
    ├── 03_REQ.md
    ├── 04_NFR.md
    ├── 05_Glossary.md
    ├── 06_Constraints.md
    ├── 07_Policy.md
    ├── 08_OQ.md
    └── 09_delta.md
```

## File responsibilities

- `01_Sources.md`
  - Register source traceability with stable `SRC-XXXX` IDs.
- `02_Scope.md`
  - Define in-scope, out-of-scope, and assumptions.
- `03_REQ.md`
  - Capture requirement catalog with source links.
- `04_NFR.md`
  - Capture non-functional requirements with measurable targets.
- `05_Glossary.md`
  - Capture domain terms and synonyms.
- `06_Constraints.md`
  - Capture technical/organizational/compliance constraints and explicit DO NOT items.
- `07_Policy.md`
  - Capture project policy and reference direction rules.
- `08_OQ.md`
  - Capture unresolved questions. Blocking `open` disposition is not allowed for discuss/require/sdd gates.
- `09_delta.md`
  - Record requirement-pack updates, rationale, and rejected options.

## Rules

- Always create outputs under `require-YYYYMMDDhhmmssSSS/` (Asia/Tokyo timestamp).
- `require-pack` must contain all 9 files and each file must have substantive content.
- Do not define spec-level implementation details in require files.
- Do not store operational status in require files. Keep status in `.qfai/status/**`.
- Do not create legacy files (`require.md`, `actors.md`, `glossary.md`, `business-flows.md`, `REQUIRE-XXXX`).
- If diagrams are included, Mermaid syntax must be inside ` ```mermaid ` fences only.

## SDD handoff

`/qfai-sdd` must stop when any of the following is true:

- no `require-*/` directory exists
- any of the 9 required files is missing
- required files are incomplete
- `08_OQ.md` contains blocking OQ (`Disposition: open` + `Gate: discuss|require|sdd`)
