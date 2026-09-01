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
- Resolved answers are promoted to `_policies` or target spec artifacts, then OQ status is updated.

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

## Item granularity (AC/BR/EX/TC)

Directory-level slicing answers "which spec does this belong to". It does not
answer "how big is one item". Referential integrity is trivially satisfied by a
single oversized node — one BR can carry nine independent rule families and
still pass every hop of `US -> AC -> BR -> EX -> TC` — so item granularity
needs its own rule.

- **AC** — one acceptance criterion is one observable outcome a reviewer can
  agree or disagree with in isolation.
- **BR** — one business rule is one independently falsifiable rule. Deletion
  test: if removing half the `Rule` text leaves a complete rule behind, split.
- **EX** — one example is one concrete input/expected pair for one BR. A
  cohesive rule bundle no single example can demonstrate in isolation may name
  several `BR-*` in the one `BR-Ref` cell; that is the exception, not the unit.
- **TC** — one test case is one verification of one AC or EX. `06_Test-Cases.md`
  already requires at least two TCs per AC; the reciprocal signal is a BR whose
  fan-out is 1 while its `Rule` cell is a size outlier against its siblings.

### Worked split

Too coarse:

| BR-ID   | Rule                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0001 | An order is accepted when the customer is verified, the stock is reserved, the payment authorisation succeeds, and the delivery address is inside the service area; otherwise it is rejected with the first failing reason. |

Each clause is independently falsifiable, so it is four rules:

| BR-ID   | Rule                                                     |
| ------- | -------------------------------------------------------- |
| BR-0001 | An unverified customer's order is rejected.              |
| BR-0002 | An order whose stock cannot be reserved is rejected.     |
| BR-0003 | An order whose payment authorisation fails is rejected.  |
| BR-0004 | An order addressed outside the service area is rejected. |

Rejection _ordering_ is a fifth rule if the order is observable, and belongs in
its own BR rather than as a trailing clause on the others.
