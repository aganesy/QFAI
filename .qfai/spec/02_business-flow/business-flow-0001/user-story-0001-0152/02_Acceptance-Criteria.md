# Acceptance Criteria

## Criteria

```gherkin
Feature: Unified SDD Workflow

# AC-0001-0152-01
# Parent: US-0001-0152
Scenario: Concrete-First Order On The Story Tree
  Given a project whose specification is the story tree,
  When `/qfai-sdd` writes the specification,
  Then it writes `01_policy/`, then `02_business-flow/`, then the stories with their US, AC and EX, and then `03_contract/` with its BRs. No Contracts-first phase runs, and no BR cites an EX that is not yet written.

# AC-0001-0152-02
# Parent: US-0001-0152
Scenario: Story-Tree Files Follow Their Templates
  Given the story tree,
  When `/qfai-sdd` writes a file of the tree,
  Then the file follows its paired `qfai-sdd` template, a story directory holds exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md` and no subdirectory, each `business-flow.md` carries a Mermaid `flowchart` or `sequenceDiagram`, and every contract file under `<paths.contractsDir>` has a row in `contracts.md`.

# AC-0001-0152-03
# Parent: US-0001-0152
Scenario: Records Go To The Two Tables
  Given the story tree,
  When `/qfai-sdd` records a triage decision, a change request, a retired story, a rejected option or an open question,
  Then each of the first four is a row of `decisions.md` and the open question is a row of `open-questions.md`. Every row carries exactly the cells ID, Content, Approach and Status, with a Status from its table's vocabulary. Nothing is written under `.qfai/decisions/`, no `01_Spec-retired` file is written, and a row already in a table changes only its Status.

# AC-0001-0152-04
# Parent: US-0001-0152
Scenario: The Five Merged Files State Each Fact Once
  Given the story tree,
  When `/qfai-sdd` writes `objective.md`, `initiative.md` or `principle.md` under `<paths.specsDir>/01_policy/`, or `tech.md` or `structure.md` under `<paths.contractsDir>`,
  Then each fact is stated in one of the five files only, and the quality-gate commands appear only in the Standard commands section of `tech.md`.

# AC-0001-0152-05
# Parent: US-0001-0152
Scenario: IDs Are The Highest In Their Scope Plus One
  Given the story tree,
  When `/qfai-sdd` allocates a BF, US, AC, EX, BR, DEC or OQ ID,
  Then the ID is the highest number its scope already names plus one. An empty scope starts at `0001`, or at `01` for the AC and EX tail. An ID whose item was retired is never reissued, and a new flow or story directory is named after its ID.

# AC-0001-0152-06
# Parent: US-0001-0152
Scenario: Business Rules Are Written Inside Contracts
  Given the story tree,
  When `/qfai-sdd` writes a business rule at the 03-contract step,
  Then the rule sits inside the contract file that enforces it, in that file type's form, with an ID, a statement and at least one EX. No separate rules file is written, and a rule that several contracts rely on is defined once and referenced by ID from the others.

# AC-0001-0152-07
# Parent: US-0001-0152
Scenario: qfai-sdd Cites Assistant Documents Where They Live
  Given the `rule/ skill/ agent/ prompt/` assistant tree,
  When the `qfai-sdd` skill cites the change-classification or the requirements-decomposition document,
  Then it cites `.qfai/assistant/rule/change-classification.md` and `<paths.skillsDir>/qfai-sdd/references/requirements-decomposition.md`, and each citation resolves to a file that exists.
```
