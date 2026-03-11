# Requirements Decomposition (SSOT)

## Purpose

Define a repeatable decomposition from external requirement sources to layered specs and tests.

This document is the decision rule SSOT for AI and humans when answering:

- What inputs are required before SDD starts?
- How should capabilities be split into spec directories?
- How is traceability kept stable?

## Canonical order (top -> down)

1. **Source registry** (`.qfai/require/require-*/01_Sources.md`)
2. **Requirement index** (`.qfai/require/require-*/03_REQ.md`)
3. **Input gaps / Open Questions** (`.qfai/require/require-*/08_OQ.md`)
4. **Policy layer** (`.qfai/specs/_policies/01..04`)
5. **Capability slices** (`.qfai/specs/spec-*/01..05` minimum)
6. **ATDD / TDD** (tests + code)

## Decision rules

### Rule 1 - Start from source-backed inputs

- Every requirement index row must point to source IDs (`SRC-XXXX`).
- If source linkage is missing, stop and create an Open Question.

### Rule 2 - Preserve layered ownership

- `.qfai/require/` stores only source/index/gap inputs.
- `.qfai/specs/` is the SSOT for detailed behavior and design decisions.
- Do not duplicate detailed spec text in `.qfai/require/`.

### Rule 3 - Keep ambiguity explicit

- Unknowns remain explicit as Open Questions.
- Resolved answers are promoted to `_policies` or `spec-XXXX` artifacts, then OQ status is updated.

## How to decompose (mechanical procedure)

1. Register source documents and assumptions in `.qfai/require/require-*/01_Sources.md`.
2. Extract concise requirement index entries in `.qfai/require/require-*/03_REQ.md`.
3. Capture missing information in `.qfai/require/require-*/08_OQ.md`.
4. Build `_policies` layer (`Objective`, `Initiative`, `Capabilities`, `Business Flow`).
5. Split by capability (`1 CAP = 1 spec-XXXX`) and produce slice files.
6. Derive acceptance tests and implementation from the finalized slices.

## Example

- Requirement index entry: `REQ-0003` linked to `SRC-0002`
- Capability mapping: `CAP-0003` in `.qfai/specs/_policies/03_Capabilities.md`
- Spec slice: `.qfai/specs/spec-0003/01_Spec.md` through `06_Test-Cases.md`

## Non-goals

- Managing release status flags in specs.
- Keeping full requirement prose in `.qfai/require/`.
- Treating diagrams as mandatory at require stage.
