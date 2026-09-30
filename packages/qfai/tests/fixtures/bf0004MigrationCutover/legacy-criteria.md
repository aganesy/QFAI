# Acceptance Criteria

## AC-0001-0001: Accept a valid order

- Parent: US-0001-0001

```gherkin
Scenario: Accept a valid order
  Given a valid order
  When it is submitted
  Then a receipt is returned
```

## AC-0001-0002: Reject an empty order

- Parent: US-0001-0001

```gherkin
Scenario: Reject an empty order
  Given an empty order
  When it is submitted
  Then no receipt is returned
```
