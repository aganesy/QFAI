# require

## Purpose

`require/` stores a lightweight requirement index for SDD preflight.

This directory is **not** a long-term SSOT for detailed requirements.
Its role is to preserve source traceability and input evidence used to create specs.

## Required structure

```text
require/
├── README.md
├── 01_sources.md
├── 02_requirement-index.md
└── 03_open-questions.md
```

## File responsibilities

- `01_sources.md`
  - List external requirement sources (file path / URL / version / date / owner / confidence).
  - Assign stable source IDs such as `SRC-0001`.
- `02_requirement-index.md`
  - Keep short extracted requirement index entries (1-3 lines each).
  - Link every entry to one or more source IDs (`SRC-XXXX`).
- `03_open-questions.md`
  - Record missing inputs detected during require/preflight.
  - Keep unresolved items explicit (`open`, `deferred`, `answered`).

## Rules

- Do not duplicate SSOT content from `.qfai/specs/_shared/**`.
- Do not create legacy requirement files (`require.md`, `actors.md`, `glossary.md`, `business-flows.md`).
- Keep entries atomic, verifiable, and traceable to `01_sources.md`.

## SDD handoff

`/qfai-sdd` and `/qfai-sdd-refinement` can start with or without require files.

- If `01_sources.md` and `02_requirement-index.md` exist: preflight uses them directly.
- If they are missing and external materials are provided: preflight runs import-lite and creates minimal index files.
- If inputs are still insufficient: unresolved points must be captured in `03_open-questions.md`.
