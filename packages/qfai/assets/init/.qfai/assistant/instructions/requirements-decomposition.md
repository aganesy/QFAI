# Requirements Decomposition (SSOT)

## Purpose

Define a repeatable decomposition from external requirement sources to layered specs and tests.

This document is the decision rule SSOT for AI and humans when answering:

- What inputs are required before SDD starts?
- How should capabilities be split into spec directories?
- How is traceability kept stable?

## Canonical order (top -> down)

1. **Source registry** (`require/01_sources.md`)
2. **Requirement index** (`require/02_requirement-index.md`)
3. **Input gaps / Open Questions** (`require/03_open-questions.md`)
4. **Shared specs** (`specs/_shared/01..04`)
5. **Capability slices** (`specs/spec-*/01..05` minimum)
6. **ATDD / TDD** (tests + code)

## Decision rules

### Rule 1 - Start from source-backed inputs

- Every requirement index row must point to source IDs (`SRC-XXXX`).
- If source linkage is missing, stop and create an Open Question.

### Rule 2 - Preserve layered ownership

- `require/` stores only source/index/gap inputs.
- `specs/` is the SSOT for detailed behavior and design decisions.
- Do not duplicate detailed spec text in `require/`.

### Rule 3 - Keep ambiguity explicit

- Unknowns remain explicit as Open Questions.
- Resolved answers are promoted to `_shared` or `spec-XXXX` artifacts, then OQ status is updated.

## How to decompose (mechanical procedure)

1. Register source documents and assumptions in `01_sources.md`.
2. Extract concise requirement index entries in `02_requirement-index.md`.
3. Capture missing information in `03_open-questions.md`.
4. Build `_shared` layer (`Objective`, `Initiative`, `Capabilities`, `Business Flow`).
5. Split by capability (`1 CAP = 1 spec-XXXX`) and produce slice files.
6. Derive acceptance tests and implementation from the finalized slices.

## Example

- Requirement index entry: `EXT-REQ-0003` linked to `SRC-0002`
- Capability mapping: `CAP-0003` in `_shared/03_Capabilities.md`
- Spec slice: `spec-0003/01_User-stories.md` through `05_Test-cases.md`

## Non-goals

- Managing release status flags in specs.
- Keeping full requirement prose in `require/`.
- Treating diagrams as mandatory at require stage.
