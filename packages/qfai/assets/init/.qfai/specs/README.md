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
├── traceability-matrix.md
└── implementation-brief.md
```

Spec packs are created in two stages:

- `/qfai-sdd-refinement` (creates upstream artifacts)
- `/qfai-sdd-planning` (creates `implementation-brief.md`)

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
    ├── traceability-matrix.md
    └── implementation-brief.md
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

## delta.md (Delta v1)

`delta.md` is both a changelog and a machine-checkable decision log.

Use the canonical template:

- `.qfai/templates/spec/delta.md`

### Required headings

- `# Delta`
- `## Update History`
- `## Decision Log`
- At least one `### DL-...` entry under Decision Log

### Required structure per DL entry

- `#### Meta` with a YAML block
- `#### Rejected` with `do_not` and `temptation` per rejected option
- `#### Verification` with `### Plan` is recommended
- If `compat: Change`, `Verification.Plan` is mandatory (Error if missing)

### Required Meta YAML keys

- `id`
- `date`
- `primary` (`Initial | Behavior | Structural | Ops`)
- `tags` (`@api @db @nfr @docs @test`, empty array allowed)
- `compat` (`Compatibility | Improvement | Change | Bug-for-bug`)
- `scope` (YAML array)
- `notes`

### Minimal template

````md
# Delta

## Update History

| Date       | DL             | Summary       |
| ---------- | -------------- | ------------- |
| YYYY-MM-DD | DL-YYYYMMDD-XX | short summary |

## Decision Log

### DL-YYYYMMDD-XX: short title

#### Meta

```yaml
id: DL-YYYYMMDD-XX
date: YYYY-MM-DD
primary: Structural
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - specs
  - tests
notes: "short review summary"
```

#### Rejected

- option: "put details only in PR text"
  reason: "not machine-checkable"
  do_not: "DO NOT rely on PR text as SSOT for change decisions."
  temptation: "PR text feels easy but disappears from local CI workflows."

#### Verification

### Plan

- id: VFY-001
  level: acceptance
  target: "what to verify"
  method: "how to verify"
  owner: dev
  expected: "expected result"
````

### Change Type guidance

Classify every DL entry with one primary and optional tags.

- Primary: `Initial | Behavior | Structural | Ops`
- Tags: `@api @db @nfr @docs @test`

SSOT: `.qfai/assistant/instructions/change-classification.md`

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

## implementation-brief.md

This file is the How SSOT for downstream execution phases.

Required H2 headings (fixed order):

1. Scope & Intent
2. Architecture / Approach
3. Implementation Plan
4. Contracts & Data
5. Test Strategy
6. Risks & Mitigations
7. Open Questions / Spikes

Template source:

- `.qfai/templates/spec/implementation-brief.md`

## Checklist (spec pack)

- [ ] All 6 required files exist and match templates.
- [ ] BR/AC/CASE/SC IDs are atomic (no multi-rule paragraphs).
- [ ] Scenario tags include AC link(s); layer/size tags follow project policy.
- [ ] Traceability matrix includes a full chain table.
- [ ] Case catalogue includes saturation evidence.
- [ ] implementation-brief.md includes all required headings in fixed order.
