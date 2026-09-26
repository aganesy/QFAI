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

# AC-0001-0152-08
# Parent: US-0001-0152
Scenario: The Rules Are Checked Against The Examples Before The Gate
  Given a `/qfai-sdd` invocation whose 03-contract step wrote or changed the Statement or the Examples cell of at least one BR,
  When that step is complete and before the per-flow gate runs,
  Then a test-design-analyst that wrote none of those BRs reads each of them, the EXs each cites and the EXs this invocation wrote or changed, and raises findings of five kinds: a case the rule implies that no example states, a redundant example, an example no rule explains, a rule its examples do not support, and a flow, story or criterion split the rules show to be wrong.
  And when the 03-contract step wrote or changed no BR, or the work order is `sdd_append`, no cycle runs.

# AC-0001-0152-09
# Parent: US-0001-0152
Scenario: Each Finding Is Decided Once, By The Right Party
  Given the findings a cycle raised,
  When they are decided,
  Then one griller for the cycle, which is neither the finder nor an author of an item a finding targets, puts them to the authors of the targeted items for at most two rounds and then adopts its own recommendation on each finding that is not critical, keeping any dissent beside it.
  And a finding that rests on product intent no BR, AC, the request or the discussion states goes to the user, and a proposed EX that no existing BR, AC or the request implies is rejected.

# AC-0001-0152-10
# Parent: US-0001-0152
Scenario: Adopted Findings Change The Tree By The Existing Routes
  Given a finding the cycle adopted,
  When its change is applied,
  Then an AC or EX this invocation wrote is changed directly, an item that existed when the invocation started changes only under an in-force `Change request:` row whose approved change covers it, and creating, splitting, merging or retiring a BF or US keeps its triage approval however recently the item was written.
  And under `--contract` a finding that only a story change answers asks for a wider change request and leaves the story unchanged, and after the changes the BRs are rewritten from the updated EXs.

# AC-0001-0152-11
# Parent: US-0001-0152
Scenario: Inside A Run The Cycle Shapes The One Question
  Given an `sdd` or `sdd_delta` stage inside a workflow run whose change touches a protected file,
  When its first attempt runs,
  Then the cycle runs on the proposal before the stage asks its one change question, the question shows the proposal as the cycle left it, each finding that goes to the user is a further `decision` question of the same `awaiting_input` result, and the attempt writes nothing.
  And the attempt holding the answer runs no further cycle, and writes the rejected findings and the records of the cycles the first attempt ran.
  And that attempt applies the answer to each finding the user decided, and appends an `Unadjudicated:` row for each finding the user left open.
  And an adopted finding on an item outside the run's checked scope appends no `Change request:` row, and the stage returns `blocked`.

# AC-0001-0152-12
# Parent: US-0001-0152
Scenario: At Most Two Cycles
  Given a cycle has ended,
  When the next cycle is considered,
  Then a cycle that adopted nothing ends the loop, a second cycle follows only a first cycle that adopted a finding, and no third cycle runs.
  And a finding that has no decision when the loop ends becomes an `open-questions.md` row at TODO whose Content opens `Unadjudicated:`.

# AC-0001-0152-13
# Parent: US-0001-0152
Scenario: A Decided Finding Is Not Raised Again
  Given a finding that was rejected or is already decided,
  When a later cycle, or a later invocation, looks for findings,
  Then each rejected finding has one `decisions.md` row at REJECTED naming its kind, its target IDs and its case by the input that distinguishes it, with the reason in Approach.
  And the finder raises no finding that has the kind and target IDs of a finding already decided in this invocation or of a REJECTED row and a case equal to, including or included in that finding's case, and no finding that the proposed change of a `Change request:` row at TODO or REJECTED already answers.
  And matching never goes by wording, and an appended reopening decision lifts the REJECTED row.

# AC-0001-0152-14
# Parent: US-0001-0152
Scenario: The Cycle Leaves A Record The Reviewer Checks
  Given an invocation in which the cycle ran,
  When the flow's SDD evidence is written and the completion reviewer reads it,
  Then the evidence holds one row per finding carrying the cycle, the finding, its kind, the target IDs, the decision, the adjudicator and the reason, one row for each cycle that raised nothing, and the finder's name in the Work Orders Summary.
  And the reviewer returns REVISE when a cycle has no row, when the finder wrote a BR it read, when a finding the user did not decide names as adjudicator its finder or an author of an item it targets, or when an adopted change to an item that existed when the invocation started was applied with no in-force triage approval or `Change request:` row whose approved change covers it.
```
