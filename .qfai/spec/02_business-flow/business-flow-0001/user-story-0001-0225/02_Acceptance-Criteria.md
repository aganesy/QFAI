# Acceptance Criteria

## Criteria

```gherkin
Feature: Review a change twice: the specification before the code, and the code at the end
  # AC-0001-0225-01
  Scenario: A change to the specification gets two reviews
    Given a change route whose specification stage changes a story-tree or contract file
    When the route runs
    Then after that stage `requirements-reviewer` reviews the specification change, joined by `architecture-reviewer` when a contract changed
    And after the last stage before verify `implementation-reviewer` reviews the whole diff

  # AC-0001-0225-02
  Scenario: A change that leaves the specification alone gets one review
    Given a change route that changes no story-tree or contract file
    When the route runs
    Then `implementation-reviewer` reviews the whole diff once, after the last stage before verify

  # AC-0001-0225-03
  Scenario: The gates alone verify
    Given the verify stage of a route, or a route that ends at `triage-close`
    When it runs
    Then it holds no review

  # AC-0001-0225-04
  Scenario: A UI-bearing flow adds the surface reviewer
    Given a change route on a flow a UI contract with screens serves
    When either review runs
    Then `product-surface-reviewer` joins it
```
