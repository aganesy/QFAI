# specs

## Purpose

Spec packs capture one feature slice and its acceptance scenario.

## Rules

- One spec pack per feature slice.
- Exactly one Scenario (or Scenario Outline) in `scenario.feature`.
- `spec.md` and `scenario.feature` must declare `QFAI-CONTRACT-REF` (use `none` if not needed).
- Keep the Business Rule list to a single BR per spec pack.

## Structure

```text
specs/
  README.md
  <spec-pack>/
    spec.md
    delta.md
    scenario.feature
```

## spec.md template (excerpt)

```md
# SPEC-0001: <short title>

## Goal

- <one sentence>

## Business Rules

- [BR-0001][P0] <one sentence>

## Acceptance Criteria

- [ ] <testable statement>

## QFAI-CONTRACT-REF

- API: <api id or none>
- DB: <db id or none>
- UI: <ui id or none>
```

## scenario.feature template (excerpt)

```gherkin
Feature: <feature name>

  Scenario: <single action slice>
    Given <precondition>
    When <action>
    Then <expected outcome>
```

## Checklist

- [ ] One spec pack equals one feature slice
- [ ] Only one Scenario exists in `scenario.feature`
- [ ] Exactly one BR is listed in `spec.md`
- [ ] QFAI-CONTRACT-REF points to existing contracts or uses `none`
