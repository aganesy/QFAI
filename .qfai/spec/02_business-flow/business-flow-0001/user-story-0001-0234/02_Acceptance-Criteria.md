# Acceptance Criteria

## Criteria

```gherkin
Feature: Choose the graph CLI that answers the exploration question

  # AC-0001-0234-01
  Scenario: Route code structure to CodeGraph
    Given a question about symbols, calls, dependencies or change impact
    When I explore the current code scope
    Then the managed code CLI queries CodeGraph first, exact returned paths may be read, and a second engine is used only for a specific unresolved cross-domain question

  # AC-0001-0234-02
  Scenario: Route document concepts to Graphify
    Given a question about requirements, rationale or document relationships
    When I explore the current ready document scope
    Then the managed documents CLI queries Graphify first and a second engine is used only for a specific unresolved cross-domain question

  # AC-0001-0234-03
  Scenario: Require an explicit processing destination
    Given documents requiring semantic analysis
    When I prepare their analysis
    Then processing uses an explicitly selected local backend or an explicitly authorized destination

  # AC-0001-0234-04
  Scenario: Query completed documents without a model
    Given fresh compatible completed document analysis
    When I query that scope without a configured backend
    Then the query uses completed analysis without requiring new model processing

  # AC-0001-0234-05
  Scenario: Report coverage and inference honestly
    Given unsupported, unparsed or incomplete content
    When a query returns evidence or no matches
    Then coverage limits and inferred relationships are distinguished from source facts and absence

  # AC-0001-0234-06
  Scenario: Recover without automatic raw search
    Given missing or stale required analysis
    When I attempt exploration
    Then the short-lived CLI attempts native preparation where needed and reports recovery, and the AI may use the fallback CLI with a pending attempt and unresolved reason without human approval

  # AC-0001-0234-07
  Scenario: Exclude secrets from analysis and its outputs
    Given requested code or document analysis and credentials for an explicitly selected backend
    When graph integration prepares analysis or reports its outcome
    Then secret files are excluded from corpus and storage and credentials are not written to tracked settings, logs or reusable snapshots
```
