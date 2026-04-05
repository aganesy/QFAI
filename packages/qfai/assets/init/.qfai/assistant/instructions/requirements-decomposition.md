---
id: requirements-decomposition
category: project
update_frequency: occasional
---

# Requirements Decomposition (SSOT)

## Purpose

Define a repeatable decomposition from external requirement sources to layered specs and tests.

This document is the decision rule SSOT for AI and humans when answering:

- What inputs are required before SDD starts?
- How should capabilities be split into spec directories?
- How is traceability kept stable?

## Canonical order (top -> down)

1. **Source registry** (`.qfai/discussion/discussion-*/04_Sources.md`)
2. **Requirement index** (`.qfai/discussion/discussion-*/06_REQ.md`)
3. **Input gaps / Open Questions** (`.qfai/discussion/discussion-*/11_OQ-Register.md`)
4. **Policy layer** (`.qfai/specs/_policies/01..11`, including Slice Policy SSOT)
5. **Capability slices** (`.qfai/specs/spec-*/01..05` minimum)
6. **ATDD / TDD** (tests + code)

## Decision rules

### Rule 1 - Start from source-backed inputs

- Every requirement index row must point to source IDs (`SRC-XXXX`).
- If source linkage is missing, stop and create an Open Question.

### Rule 2 - Preserve layered ownership

- `.qfai/discussion/` stores only source/index/gap inputs.
- `.qfai/specs/` is the SSOT for detailed behavior and design decisions.
- Do not duplicate detailed spec text in `.qfai/discussion/`.

### Rule 3 - Keep ambiguity explicit

- Unknowns remain explicit as Open Questions.
- Resolved answers are promoted to `_policies` or `spec-XXXX` artifacts, then OQ status is updated.

## How to decompose (mechanical procedure)

1. Register source documents and assumptions in `.qfai/discussion/discussion-*/04_Sources.md`.
2. Extract concise requirement index entries in `.qfai/discussion/discussion-*/06_REQ.md`.
3. Capture missing information in `.qfai/discussion/discussion-*/11_OQ-Register.md`.
4. Build `_policies` layer (`Objective`, `Initiative`, `Capabilities`, `Business Flow`, and `11_Slice-Policy.md`).
5. Define or refresh `_policies/11_Slice-Policy.md` before any create/update/delete slice decision.
6. Split by the approved slice policy and produce slice files.
7. Derive acceptance tests and implementation from the finalized slices.

## Example

- Requirement index entry: `REQ-0003` linked to `SRC-0002`
- Capability mapping: `CAP-0003` in `.qfai/specs/_policies/03_Capabilities.md`
- Spec slice: `.qfai/specs/spec-0003/01_Spec.md` through `06_Test-Cases.md`

## Non-goals

- Managing release status flags in specs.
- Keeping full requirement prose in `.qfai/discussion/`.
- Treating diagrams as mandatory at require stage.
