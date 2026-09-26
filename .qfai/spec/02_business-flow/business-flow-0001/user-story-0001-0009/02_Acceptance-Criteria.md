# Acceptance Criteria

## Criteria

```gherkin
Feature: Traceability chain BF → US → AC → EX ← BR

# AC-0001-0009-01
# Parent: US-0001-0009
Scenario: Each EX cites exactly one AC, and every AC has an EX
  Given a story on the story tree
  When the rows of its `03_Example.md` are read
  Then each EX row names exactly one existing AC of the same story in its `AC-Ref` cell
  And every AC of the story is named by at least one EX

# AC-0001-0009-02
# Parent: US-0001-0009
Scenario: Business rules and examples cite each other many-to-many
  Given the contracts and stories of a project on the story tree
  When the examples of every business rule are read
  Then every BR cites at least one existing EX
  And every EX is cited by at least one BR

# AC-0001-0009-03
# Parent: US-0001-0009
Scenario: A business rule lives in the contract that enforces it
  Given a business rule of a project on the story tree
  When the contract layer is read
  Then the rule is declared once, in the contract file that enforces it, in the form that file type allows
  And every other contract that relies on it lists its ID as a rule ref
```
