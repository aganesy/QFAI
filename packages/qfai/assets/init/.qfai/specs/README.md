# specs (Specification Packs)

## Purpose

A **spec pack** is the unit of delivery for one feature slice.
Each pack bundles:

```text
spec-XXXX/
├── spec.md
├── delta.md
├── scenario.feature
├── case-catalogue.md
└── traceability-matrix.md
```

Spec packs are created by `/qfai-spec`.

## Directory rules

- One spec pack per folder: `spec-XXXX/`
- Required files are mandatory for validation.

```text
specs/
├── README.md
└── spec-0001/
    ├── spec.md
    ├── delta.md
    ├── scenario.feature
    ├── case-catalogue.md
    └── traceability-matrix.md
```

## Cross-file invariants

- IDs must be unique and stable:
  - `SPEC-XXXX` (pack)
  - `BR-XXXX-YYYY` (business rule)
  - `AC-XXXX-YYYY` (acceptance criteria)
  - `CASE-XXXX-YYYY` (test case)
  - `SC-XXXX-YYYY` (scenario tag in feature file)
- Traceability must be consistent:
- `traceability-matrix.md` maps **REQ → BR → AC → CASE → SC → Status → Contracts**.
- `scenario.feature` may contain multiple Scenarios/Outlines (standard Gherkin style).
- Layer/size tags:
  - Each Scenario SHOULD declare `@layer:<...>` and `@size:<...>` once the project opts in.
  - Keep E2E minimal; use integration/API tests to avoid “ice cream cone”.

---

## spec.md

### Template

```md
# SPEC-<XXXX>: <Title>

## Metadata

| Key          | Value                                  |
| ------------ | -------------------------------------- |
| Spec ID      | SPEC-<XXXX>                            |
| Title        | <Title>                                |
| Status       | Draft \\ In Review \\ Approved         |
| Version      | <semver or doc version>                |
| Created      | <YYYY-MM-DD>                           |
| Updated      | <YYYY-MM-DD>                           |
| Owner        | <role/person>                          |
| Requirements | <comma-separated REQ IDs>              |
| Contracts    | <comma-separated Contract IDs or none> |
| Depends On   | <SPEC-IDs or none>                     |

## 1. Goal

<one paragraph: user / business goal>

## 2. Non-goals

- <explicitly out of scope>

## 3. Background / Context

- <why now>
- <constraints, legacy considerations>

## 4. Scope

### 4.1 In scope

- <bullets>

### 4.2 Out of scope

- <bullets>

## 5. Business Rules (BR)

> Rule: **one BR = one rule**. Split when multiple independent constraints appear.

- [BR-<XXXX>-0001][P0] <atomic rule>.
- [BR-<XXXX>-0002][P1] <atomic rule>.

## 6. Acceptance Criteria (AC)

- [AC-<XXXX>-0001][P0] <atomic, testable acceptance criterion>.
- [AC-<XXXX>-0002][P1] <atomic, testable acceptance criterion>.

## 7. Scenarios (SC inventory)

- [SC-<XXXX>-0001] <short title> — covers: AC-<XXXX>-0001, BR-<XXXX>-0001
- [SC-<XXXX>-0002] <short title> — covers: ...

## 8. Edge Cases / Risks

- <risk> → <mitigation>

## 9. Observability / Operability

- logging
- metrics
- alerting
- audit requirements (if any)

## 10. Open Questions

- [OQ-SPEC-<XXXX>-0001] <question>

## 11. Revision History

| Date         | Change    |
| ------------ | --------- |
| <YYYY-MM-DD> | <summary> |
```

### Sample (excerpt)

```md
## 5. Business Rules (BR)

- [BR-0002-0001][P0] Product code is set at creation time and MUST remain immutable.
- [BR-0002-0002][P0] Product code MUST be unique across the system.
- [BR-0002-0003][P1] Deleted products are hidden by default; users may opt-in to include deleted items.

## 6. Acceptance Criteria (AC)

- [AC-0002-0001][P0] Creating a product with a duplicate code returns a user-visible error and does not persist data.
- [AC-0002-0002][P0] The product list supports searching by code or name substring.
```

---

## delta.md (History + Decision Records)

`delta.md` serves **two roles** and must keep both:

- **Change Log**: when/what/why changed
- **Decision Records**: options considered, selected, and rejected (to prevent reintroducing rejected options)

### Contract rules

- Required headings (order fixed):
  - `## Change Log`
  - `## Decision Records`
- **Append-only**: never edit past entries. Add correction entries instead.
- **RE-OPEN**: if a rejected option must be reconsidered, add a `[RE-OPEN]` Decision Record that references the prior DR-ID, states what changed + updated criteria, and includes explicit approval (user or instructions/steering).

### Template

```md
# Delta — SPEC-<XXXX>: <Title>

## Metadata

| Key     | Value                                    |
| ------- | ---------------------------------------- |
| Spec ID | SPEC-<XXXX>                              |
| Primary | Initial \| Behavior \| Structural \| Ops |
| Tags    | @api @db @nfr @docs @test (or none)      |
| Created | <YYYY-MM-DD>                             |
| Updated | <YYYY-MM-DD>                             |
| Owner   | <role/person>                            |

## Change Log

### CL-0001 — <short title>

- date: <YYYY-MM-DD>
- author: <AI/role or human>
- change_type_primary: Initial | Behavior | Structural | Ops
- change_type_tags: <space-separated tags or empty>
  - example: @api @db
- scope: <files/areas>
- change: <what changed>
- reason: <why it changed>
- links: <PR/issue/DR>

## Decision Records

### DR-0001: <topic>

- date: <YYYY-MM-DD>
- context: <context>
- options_considered:
  - A: <option summary>
  - B: <option summary>
- selection_criteria:
  - <criterion>
- selected: <option>
- rejected:
  - <option> — <reason>
    - do_not: <what must not be reintroduced>
    - temptation: <why it may be tempting to reintroduce>
- impact: <downstream impact>
- followups: <todos>
- related_contracts: <QFAI-CONTRACT-REF or IDs>

### [RE-OPEN] DR-0002: <topic>

- date: <YYYY-MM-DD>
- previous_dr: DR-0001
- what_changed: <what changed>
- updated_criteria: <new criteria>
- selected: <option>
- rejected:
  - <option> — <reason>
- approval: <user or instructions/steering>

## Decision Guardrails

> Optional: add for critical rejected/deferred items.

### DG-0001: <title>

- Type: non-goal | not-now | trade-off
- Guardrail: <1 sentence. What must NOT be done / must be deferred>
- Reason: <1-3 sentences>
- Reconsider: <never or explicit condition>
- Related: <optional links/IDs>
- Keywords: <comma or space separated>
```

### Change Classification (Primary + Tags)

`delta.md` MUST declare **Primary** and **Tags** in `## Metadata`.

- **Primary**: choose exactly one. It expresses the _main purpose_ of the change.
- **Tags**: choose zero or more. They express which _surfaces_ are impacted.

This classification is a review and test-planning primitive. It must be selected deterministically.

**SSOT for decision rules**: `.qfai/assistant/instructions/change-classification.md`

Quick guidance:

- Primary = **Behavior** when user-observable outputs change (validate/report/init/config/CLI behavior).
- Primary = **Initial** when a capability/artifact is introduced without changing existing behavior.
- Primary = **Structural** when internals change but external behavior remains the same.
- Primary = **Ops** when only CI/release/tooling/docs/tests change (runtime behavior unchanged).

Tags (multi-select):

- `@api`: public interfaces / schemas / formats
- `@db`: persisted data formats or DB contracts
- `@nfr`: performance/reliability/security/operability
- `@docs`: documentation and guides
- `@test`: tests and verification strategy

---

## scenario.feature

### Template

```gherkin
@SPEC-<XXXX>
Feature: <short title>

  # QFAI-CONTRACT-REF: UI-0001, API-0002, DB-0003

  Background:
    Given the system is running

  @SC-<XXXX>-0001 @AC-<XXXX>-0001 @layer-integration @size-m
  Scenario: <title>
    Given ...
    When ...
    Then ...

  @SC-<XXXX>-0002 @AC-<XXXX>-0002 @layer-e2e @size-l
  Scenario Outline: <title>
    Given ...
    When ...
    Then ...
    Examples:
      | ... |
      | ... |
```

### Sample (excerpt)

```gherkin
@SC-0002-0001 @AC-0002-0001 @layer-api @size-s
Scenario: Reject duplicate product code
  Given an existing product with code "P-100"
  When I create a product with code "P-100"
  Then the API responds with status 409
  And the error code is "DUPLICATE_PRODUCT_CODE"
```

---

## case-catalogue.md

### Template

```md
# Case Catalogue — SPEC-<XXXX>: <Title>

## Metadata

| Key     | Value        |
| ------- | ------------ |
| Spec ID | SPEC-<XXXX>  |
| Created | <YYYY-MM-DD> |
| Updated | <YYYY-MM-DD> |

## Coverage techniques applied

- boundary value analysis
- equivalence partitioning
- decision tables
- state transition (if applicable)
- negative/security abuse cases (if applicable)

## Case list

> One CASE = one test intent (can map to SC and/or unit/component tests later)

- [CASE-<XXXX>-0001] <case title> — covers: AC-<XXXX>-0001, BR-<XXXX>-0002
- [CASE-<XXXX>-0002] ...

## Security / abuse cases (optional)

- [CASE-<XXXX>-9XXX] ...

## Saturation evidence

Explain why the case set is “enough”:

- how partitions/boundaries were covered
- what was intentionally excluded and why
```

---

## traceability-matrix.md

### Template

```md
# Traceability Matrix — SPEC-<XXXX>: <Title>

## Metadata

| Key     | Value        |
| ------- | ------------ |
| Spec ID | SPEC-<XXXX>  |
| Created | <YYYY-MM-DD> |
| Updated | <YYYY-MM-DD> |

## Full chain (REQ → BR → AC → CASE → SC → Status → Contracts)

| REQ           | BR             | AC             | CASE             | SC             | Status      | Contracts                  |
| ------------- | -------------- | -------------- | ---------------- | -------------- | ----------- | -------------------------- |
| REQ-FUNC-0010 | BR-<XXXX>-0001 | AC-<XXXX>-0001 | CASE-<XXXX>-0001 | SC-<XXXX>-0001 | implemented | UI-0001, API-0002, DB-0003 |

Status values:

- `implemented` | `planned` (default: implemented if omitted)
- Use `planned` for Unit/Component during ATDD phase; promote to `implemented` in TDD/full.

Note: The Status column is optional. If omitted, all rows are treated as `implemented` for backward compatibility.

## Coverage summary

- Missing AC coverage: <list or none>
- Missing CASE coverage: <list or none>
- Missing SC coverage: <list or none>

## Notes

- Explain any intentional gaps (deferred items).
```

---

## Checklist (spec pack)

- [ ] All 5 required files exist and match templates.
- [ ] BR/AC/CASE/SC IDs are atomic (no multi-rule paragraphs).
- [ ] Scenario tags include AC link(s); layer/size tags follow project policy.
- [ ] Traceability matrix includes a full chain table.
- [ ] Case catalogue includes saturation evidence.
