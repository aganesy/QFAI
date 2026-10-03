# Acceptance Criteria

## Criteria

```gherkin
Feature: Unified SDD Workflow
  # AC-0001-0147-01
  Scenario: Concrete-First Order On The Story Tree
    Given a project whose specification is the story tree,
    When `/qfai-sdd` writes the specification,
    Then it writes `01_policy/`, then `02_business-flow/`, then the stories with their US, AC and EX, and then `03_contract/` with its BRs. No Contracts-first phase runs, and no BR cites an EX that is not yet written.

  # AC-0001-0147-02
  Scenario: Story-Tree Files Follow Their Templates
    Given the story tree,
    When `/qfai-sdd` writes a file of the tree,
    Then the file follows its paired `qfai-sdd` template, a story directory holds exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md` and no subdirectory, each `business-flow.md` carries a Mermaid `flowchart` or `sequenceDiagram`, and every contract file under `<paths.contractsDir>` has a row in `contracts.md`.

  # AC-0001-0147-03
  Scenario: Records Go To The Two Tables
    Given the story tree,
    When `/qfai-sdd` records a triage decision, a change request, a retired story, a rejected option or an open question,
    Then each of the first four is a row of `decisions.md` and the open question is a row of `open-questions.md`. Every row carries exactly the cells ID, Content, Approach and Status, with a Status from its table's vocabulary. Nothing is written under `.qfai/decisions/`, no `01_Spec-retired` file is written, and a row already in a table changes only its Status.

  # AC-0001-0147-04
  Scenario: The Four Merged Files State Each Fact Once
    Given the story tree,
    When `/qfai-sdd` writes `objective.md`, `initiative.md` or `principle.md` under `<paths.specsDir>/01_policy/`, or `tech.md` under `<paths.contractsDir>`,
    Then each fact is stated in one of the four files only, and the quality-gate commands appear only in the Standard commands section of `tech.md`.

  # AC-0001-0147-05
  Scenario: IDs Are The Highest In Their Scope Plus One
    Given the story tree,
    When `/qfai-sdd` allocates a BF, US, AC, EX, BR, DEC or OQ ID,
    Then the ID is the highest number its scope already names plus one. An empty scope starts at `0001`, or at `01` for the AC and EX tail. An ID whose item was retired is never reissued, and a new flow or story directory is named after its ID.

  # AC-0001-0147-06
  Scenario: Business Rules Are Written Inside Contracts
    Given the story tree,
    When `/qfai-sdd` writes a business rule at the 03-contract step,
    Then the rule sits inside the contract file that enforces it, in that file type's form, with an ID, a statement and at least one EX. No separate rules file is written, and a rule that several contracts rely on is defined once, in the contract authoritative for it, and cited by no other contract.

  # AC-0001-0147-07
  Scenario: qfai-sdd Cites Assistant Documents Where They Live
    Given the `rule/ skill/ agent/ prompt/` assistant tree,
    When the `qfai-sdd` skill cites the change-classification or the requirements-decomposition document,
    Then it cites `.qfai/assistant/rule/change-classification.md` and `<paths.skillsDir>/qfai-sdd/references/requirements-decomposition.md`, and each citation resolves to a file that exists.

  # AC-0001-0147-08
  Scenario: The Rules Are Checked Against The Examples Before The Gate
    Given a `/qfai-sdd` invocation whose 03-contract step wrote or changed the Statement or the Examples cell of at least one BR,
    When that step is complete and before the per-flow gate runs,
    Then a sub-agent that wrote none of those BRs reads each of them, the EXs each cites and the EXs this invocation wrote or changed, and raises findings of five kinds: a case the rule implies that no example states, a redundant example, an example no rule explains, a rule its examples do not support, and a flow, story or criterion split the rules show to be wrong.
    And when the 03-contract step wrote or changed no BR, or the stage is an append stage, no cycle runs.

  # AC-0001-0147-09
  Scenario: Each Finding Is Decided Once, By The Right Party
    Given the findings a cycle raised,
    When they are decided,
    Then one griller for the cycle, which is neither the finder nor an author of an item a finding targets, puts them to the authors of the targeted items for at most two rounds and then adopts its own recommendation on each finding that is not critical, keeping any dissent beside it.
    And a finding that rests on product intent that no BR, no AC, the request nor the discussion states goes to the user, and a proposed EX that no existing BR, AC or the request implies is rejected.

  # AC-0001-0147-10
  Scenario: Adopted Findings Change The Tree By The Existing Routes
    Given a finding the cycle adopted,
    When its change is applied,
    Then an AC or EX this invocation wrote is changed directly, an item that existed when the invocation started changes only under an in-force `Change request:` row whose approved change covers it, and creating, splitting, merging or retiring a BF or US keeps its triage approval however recently the item was written.
    And under `--contract` a finding that only a story change answers asks for a wider change request and leaves the story unchanged, and after the changes the BRs are rewritten from the updated EXs.

  # AC-0001-0147-12
  Scenario: At Most Two Cycles
    Given a cycle has ended,
    When the next cycle is considered,
    Then a cycle that adopted nothing ends the loop, a second cycle follows only a first cycle that adopted a finding, and no third cycle runs.
    And a finding that has no decision when the loop ends becomes an `open-questions.md` row at TODO whose Content opens `Unadjudicated:`.

  # AC-0001-0147-13
  Scenario: A Decided Finding Is Not Raised Again
    Given a finding that was rejected or is already decided,
    When a later cycle, or a later invocation, looks for findings,
    Then each rejected finding has one `decisions.md` row at REJECTED naming its kind, its target IDs and its case by the input that distinguishes it, with the reason in Approach.
    And the finder raises no finding that has the kind and target IDs of a finding already decided in this invocation or of a REJECTED row and a case equal to, including or included in that finding's case, and no finding that the proposed change of a `Change request:` row at TODO or REJECTED already answers.
    And matching never goes by wording, and an appended reopening decision lifts the REJECTED row.

  # AC-0001-0147-15
  Scenario: A Pre-draft Grilling Checkpoint Precedes Each Design Write
    Given an invocation of `/qfai-sdd` about to write in a design-writing stage,
    When the stage makes its first story-tree write,
    Then a delegated grilling checkpoint has settled that stage's open decisions, a critical one by the user's answer.
    And the final report lists each decision the checkpoint adopted, with its reason.
```
