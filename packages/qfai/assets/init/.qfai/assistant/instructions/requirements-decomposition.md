# Requirements Decomposition (SSOT)

## Purpose

Define a **repeatable decomposition** from top-level domain context to requirements, specs, and tests.

This document is the **decision rule SSOT** for AI and humans when answering:

- "What is the top-level structure?"
- "How do we break down work into spec packs?"
- "How do we keep traceability stable?"

## Canonical order (top -> down)

1. **Glossary** (`require/glossary.md`)
2. **Actors** (`require/actors.md`)
3. **Business flows** (`require/business-flows.md`)
4. **Requirements** (`require/REQUIRE-XXXX/*` preferred, `require/require.md` legacy compatibility)
5. **Spec packs** (`specs/spec-*/spec.md`, `delta.md`, `scenario.feature`, `case-catalogue.md`, `traceability-matrix.md`)
6. **ATDD / TDD** (tests + code)

## Decision rules

### Rule 1 - Always anchor scope to Business Flow steps

- A spec pack MUST be a slice of **one or more BF steps**.
- If a BF step is in scope, it MUST be covered by:
  - a requirement (`REQ-*`) and/or
  - a spec pack (`spec-*`) and/or
  - an explicit Out-of-scope row in the Coverage Map.

### Rule 2 - Use actors to remove ambiguity

When writing requirements/specs/scenarios, explicitly name:

- the primary actor who initiates the interaction
- any supporting actors (external services, humans, systems)

If an actor is missing, add it to `actors.md` before proceeding.

### Rule 3 - Keep Glossary small but authoritative

- Add terms only if they reduce ambiguity or avoid inconsistent naming.
- Prefer **one term** with synonyms over multiple near-duplicate terms.
- When a term changes meaning, record the decision in a discussion log.

## How to decompose (mechanical procedure)

1. Draft **Actors** (Primary / Supporting / System).
2. Draft **Business Flow backbone**:
   - 5-15 steps per flow is a useful target.
   - Each step should be a verb phrase and observable.
3. For each in-scope BF step, draft:
   - a candidate user story (optional; can remain implicit)
   - one or more atomic **REQ-FUNC** items (EARS style recommended)
   - any **REQ-NFR** needed for the step
4. Group BF steps into spec packs:
   - Aim for 1-3 scenarios per spec pack.
   - Split when scenarios exceed that or when the slice spans multiple distinct user goals.
5. In each spec pack:
   - Reference BF step IDs and actor IDs in `spec.md` Context.
   - Ensure traceability matrix includes BF step IDs.

## Examples

### Example: One BF step -> one spec pack

- BF step: `BF-0003-S02 User submits validation request`
- Spec pack: `spec-0012`
  - Context: Actor `ACT-0001 Developer`
  - Traceability: `BF-0003-S02 -> REQ-FUNC-0044 -> spec-0012 -> SC-0012-01`

## Non-goals

- BPMN diagrams are NOT required (text-first). If you add diagrams, they are optional evidence, not SSOT.
