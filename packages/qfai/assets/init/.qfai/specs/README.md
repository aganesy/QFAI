# specs

## Purpose

Spec packs capture one feature slice and its acceptance scenarios.

## Rules

- One spec pack per feature slice.
- `scenario.feature` may contain multiple Scenarios/Outlines (recommended 1-3; split if more).
- SC tags must be unique within `scenario.feature`.
- `spec.md` and `scenario.feature` must declare `QFAI-CONTRACT-REF` (use `none` if not needed).
- Keep the Business Rule list to a single BR per spec pack.
- Case Catalogue and traceability matrix are required for each spec pack.
- AC/CASE IDs are supported: `AC-0001-0001`, `CASE-0001-0001`.
- Optional test strategy tags (opt-in): `@layer-unit|@layer-component|@layer-integration|@layer-api|@layer-e2e` and `@size-s|@size-m|@size-l`.

## Structure

```text
specs/
  README.md
  <spec-pack>/
    spec.md
    case-catalogue.md
    delta.md
    scenario.feature
    traceability-matrix.md
```

## spec.md template (excerpt)

```md
# SPEC-0001: <short title>

QFAI-CONTRACT-REF: <ID list or none>

## Goal

- <one sentence>

## Business Rules

- [BR-0001-0001][P0] <one sentence>

## Acceptance Criteria

- [AC-0001-0001] Given/When/Then ... (CASE-0001-0001)
```

## scenario.feature template (excerpt)

```gherkin
@SPEC-0001
Feature: <feature name>

  # QFAI-CONTRACT-REF: <ID list or none>
  @SC-0001-0001 @BR-0001-0001 @layer-unit @size-s
  Scenario: <action slice>
    Given <precondition>
    When <action>
    Then <expected outcome>

  @SC-0001-0002 @BR-0001-0001 @layer-integration @size-m
  Scenario: <additional slice>
    Given <precondition>
    When <action>
    Then <expected outcome>
```

## Checklist

- [ ] One spec pack equals one feature slice
- [ ] Scenario count is within the recommended range (1-3) or the pack is split
- [ ] SC tags are unique within `scenario.feature`
- [ ] Exactly one BR is listed in `spec.md`
- [ ] case-catalogue.md and traceability-matrix.md exist
- [ ] QFAI-CONTRACT-REF points to existing contracts or uses `none`
