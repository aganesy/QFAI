# Acceptance Criteria

## Criteria

```gherkin
Feature: Write the business rules into their contracts

# AC-0004-0009-01
# Parent: US-0004-0009
Scenario: Rules land in YAML, SQL and Markdown contracts with their examples
  Given a plan placing one rule in a YAML or JSON contract, one in a SQL contract and one in a Markdown contract
  When step 7 runs
  Then each contract carries its rule in the form its file type allows
  And each rule's examples are the new IDs of every example with a new ID whose old BR-Ref named it

# AC-0004-0009-02
# Parent: US-0004-0009
Scenario: Unplaced rules and the old non-functional requirement lists go to a person
  Given a rule the plan does not place, a rule placed in a contract file that does not exist, a rule no example cites, and a spec pack with an Applicable NFR list
  When step 7 runs
  Then each is listed under For a person with its file and the reason
  And the Applicable NFR entry names the contracts that spec's rules went to
```
