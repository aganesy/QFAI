# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping skill validation
  # AC-0001-0042-01
  Scenario: Prototyping skill drift is reported
    Given the current prototyping skill
    When the prototyping skill validator runs
    Then the prototyping skill validator confirms current skill sections and CLI-removal wording.

  # AC-0001-0042-02
  Scenario: Legacy validators stay validator slices
    Given legacy artifact validators exist
    When production validation runs
    Then legacy artifact validators are treated as validator slices rather than proof of a public runtime surface.

  # AC-0001-0042-03
  Scenario: A present, parseable DESIGN.md raises no design finding
    Given root `DESIGN.md` and `references/design-md-spec.md`
    When `qfai validate` runs
    Then a root `DESIGN.md` that exists and whose front matter parses per `references/design-md-spec.md` raises neither `QFAI-DCON-030` nor `QFAI-DCON-033`.

  # AC-0001-0042-13
  Scenario: A missing or unparseable DESIGN.md is reported
    Given root `DESIGN.md` is missing or its front matter does not parse
    When `qfai validate` runs
    Then a missing `DESIGN.md` emits `QFAI-DCON-030` at error severity, and an unparseable one emits `QFAI-DCON-033` at error severity.
```
