# Acceptance Criteria

## Criteria

```gherkin
Feature: Report acceptance scaffold evidence and follow-up
  # AC-0001-0233-01
  Scenario: Acceptance evidence is separated in an applicable human report
    Given the implementation, verification or handoff scope includes acceptance scaffolds or unfinished BF or AC acceptance bodies
    When the session reports that scope's evidence and remaining work
    Then its human-readable detail report identifies annotation IDs with proof, body classifications with counts and units and file references, actual asserted behavior with actual run results, observed outcomes with logs or evidence references, and remaining BF or AC bodies with their owner and completion criteria and next route
    And body classifications distinguish empty, implemented and unclassified, with UNKNOWN for counts not established by inspection
    And an implemented body has evidence of its actual assertion, not only an annotation or an assertion for another EX
    And PASS, FAIL, skipped, UNRUN and pending observations remain distinct and only actual runs supply execution results

  # AC-0001-0233-02
  Scenario: Follow-up preserves existing exemptions and completion boundaries
    Given the report includes an empty or unfinished acceptance body, or its count or owner is unknown
    When the session summarizes or hands off the remaining work
    Then each identified remaining BF or AC body retains its actual owner or UNASSIGNED, completion criteria and next route
    And unknown counts remain UNKNOWN rather than zero
    And a passing total minus empty bodies, native guidance fixtures and zero validation errors do not establish BF or AC behavioral proof or complete acceptance bodies
    And legitimate empty bodies keep the existing exemption, an actual required-check FAIL remains FAIL, and acceptance-writing completion rules remain unchanged
    And an existing optional verify.json summary stays one or two short sentences naming the remaining work, owner and detail-report pointer without a table or new field
    And a lint-only scope without acceptance scaffolds or unfinished BF or AC bodies requires no such report
    And no runtime scanner, JSON field, result status, gate, route or scope is added
```
