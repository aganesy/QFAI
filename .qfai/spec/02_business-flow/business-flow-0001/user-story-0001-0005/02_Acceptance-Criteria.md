# Acceptance Criteria

## Criteria

```gherkin
Feature: Story tree layout

# AC-0001-0005-01
# Parent: US-0001-0005
Scenario: The story tree root holds the two tables and the three layers
  Given a project whose specification is on the story tree
  When the entries directly under `paths.specsDir` are listed
  Then they include `decisions.md`, `open-questions.md`, `01_policy/` and `02_business-flow/`
  And the contract layer sits at `paths.contractsDir`, which is `03_contract/` under `paths.specsDir` by default

# AC-0001-0005-02
# Parent: US-0001-0005
Scenario: The business-flow layer holds one directory per flow and per story
  Given a project on the story tree with at least one business flow
  When `02_business-flow/` is listed
  Then it holds `business-flows.md` and one `business-flow-NNNN/` directory per flow
  And each flow directory holds `business-flow.md` with a Mermaid diagram, `user-stories.md`, and one `user-story-NNNN-NNNN/` directory per story

# AC-0001-0005-03
# Parent: US-0001-0005
Scenario: A story directory holds exactly three files
  Given a story directory on the story tree
  When its entries are listed
  Then they are exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md`
  And it holds no subdirectory
```
