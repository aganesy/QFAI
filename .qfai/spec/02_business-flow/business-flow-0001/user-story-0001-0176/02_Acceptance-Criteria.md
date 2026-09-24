# Acceptance Criteria

## Criteria

```gherkin
Feature: Envelope-deviation `AskUserQuestion` audit-log

# AC-0001-0176-01
# Parent: US-0001-0176
Scenario: Envelope-deviation `AskUserQuestion` writes a decision record
  Given an `AskUserQuestion` whose template names one of the four envelope-deviation contexts (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion),
  When the skill body resolves the answer,
  Then it MUST write `.qfai/evidence/decision/<ISO8601-ts>.json` shaped `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}` per DR-0270; `.qfai/evidence/decision/` MUST be **tracked** in version control (the managed `.gitignore` block negates it after `.qfai/evidence/*`), because a decision record carries operator approval and cannot be regenerated — unlike the regenerable `.qfai/evidence/prototyping/`. An `AskUserQuestion` that names none of the four contexts MUST NOT write a record (no fail-open false-positive).
```
