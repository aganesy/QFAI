# require

## Purpose

`require/` stores a lightweight requirement index for SDD preflight.

This directory is **not** a long-term SSOT for detailed requirements.
Its role is to preserve source traceability and input evidence used to create specs.

## Required structure

```text
require/
├── README.md
├── require-YYYYMMDDhhmmssSSS/
│   ├── 01_sources.md
│   ├── 02_requirement-index.md
│   └── 03_open-questions.md
└── (optional) ../evidence/require-YYYYMMDDhhmmssSSS.md
```

## File responsibilities

- `01_sources.md`
  - List external requirement sources (file path / URL / version / date / owner / confidence).
  - Assign stable source IDs such as `SRC-0001`.
- `02_requirement-index.md`
  - Keep short extracted requirement index entries (1-3 lines each, what-only).
  - Use stable `REQ-XXXX` identifiers and include source refs for every entry.
- `03_open-questions.md`
  - Record missing inputs detected during require/preflight.
  - Keep unresolved items explicit (`open`, `deferred`, `answered`).

## Rules

- Do not duplicate SSOT content from `.qfai/specs/_shared/**`.
- Do not define Business Flow / User Stories / AC / BR / Examples / Test Cases in require outputs.
- Do not store operational status in require outputs. Keep status in `.qfai/status/**`.
- Do not create legacy requirement files (`require.md`, `actors.md`, `glossary.md`, `business-flows.md`).
- Create new outputs under `require-YYYYMMDDhhmmssSSS/` (Asia/Tokyo timestamp).
- Keep `.qfai/require/README.md` at the root as the structure SSOT.
- Keep entries atomic, verifiable, and traceable to `01_sources.md`.
- If diagrams are included in require artifacts, Mermaid syntax must be inside ` ```mermaid ` fences only.
- Do not write Mermaid syntax in ` ```text ` or language-less fences.

## SDD handoff

`/qfai-sdd` and `/qfai-sdd-refinement` can start with or without require files.

- If `require-*/01_sources.md` and `require-*/02_requirement-index.md` exist: preflight uses the latest pack.
- If they are missing and external materials are provided: preflight runs import-lite and creates a minimal require pack.
- If inputs are still insufficient: unresolved points must be captured in `require-*/03_open-questions.md`.
