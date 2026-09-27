# Acceptance Criteria

## Criteria

```gherkin
Feature: Mock template emits anchor-form hrefs by default

# AC-0001-0092-01
# Parent: US-0001-0092
Scenario: Mock template default + strict validator (anchor-form)
  Given the shipped `qfai-discussion` mock template and SKILL.md authoring guidance,
  When an HTML mock is authored in `03_Story-Workshop.md`,
  Then the template-emitted links are anchor-form (`<a href="#<name>">`) and SKILL.md instructs anchor-form authoring; `QFAI-MOCK-010` continues to PASS anchor hrefs (`#name`) and external `http(s)://` hrefs, and same-origin absolute hrefs (`/path/`) are NOT emitted by the template.

# AC-0001-0092-02
# Parent: US-0001-0092
Scenario: Mock template ↔ validator SSOT-sync (`R-MOCK-HREF-DRIFT`)
  Given the template ↔ `QFAI-MOCK-010` validator SSOT-sync pair (Pair V),
  When one side is edited without the matching update to the other,
  Then the Reviewer-Gate finding `R-MOCK-HREF-DRIFT` (severity error) fires naming the asymmetric edit.
```
