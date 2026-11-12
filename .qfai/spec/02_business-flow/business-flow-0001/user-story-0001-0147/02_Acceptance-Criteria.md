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
    When `/qfai-sdd` records a decision the user made that passes the recording test, a rejected option or an open question,
    Then each of the first two is a row of `decisions.md` and the open question is a row of `open-questions.md`. Every row carries exactly the cells ID, Content and Approach, and a rejected option is a row whose Content opens `Declined:`, which authorizes nothing. Nothing is written under `.qfai/decisions/`, no `01_Spec-retired` file is written, and a row the register holds keeps its ID and is never removed; its wording may be restated.
    And a decision that replaces or narrows an earlier one is a new row whose Approach cites the earlier ID, and the earlier row stays as written.
    And a question deferred after its row was written is deleted, and a new question row is appended whose Approach names the next decision point and says `Replaces OQ-…` with the deleted ID.

  # AC-0001-0147-04
  Scenario: The Four Merged Files State Each Fact Once
    Given the story tree,
    When `/qfai-sdd` writes `objective.md`, `initiative.md` or `principle.md` under `<paths.specsDir>/01_policy/`, or `tech.md` under `<paths.contractsDir>`,
    Then each fact is stated in one of the four files only, and the quality-gate commands appear only in the Standard commands section of `tech.md`.

  # AC-0001-0147-05
  Scenario: IDs Are The Highest In Their Scope Plus One
    Given the story tree,
    When `/qfai-sdd` allocates a BF, US, AC, EX or BR ID,
    Then the ID is the highest number its scope already names plus one, counting the IDs the base and, where a forge CLI lists them, the open pull requests' heads add. An empty scope starts at `0001`, or at `01` for the AC and EX tail. An ID whose item was retired is never reissued, and a new flow or story directory is named after its ID.
    And a `decisions.md` or `open-questions.md` row takes as its ID the UTC time it is written, `DEC-yyyymmddhhMMss` or `OQ-yyyymmddhhMMss`, without reading the base or any pull request.

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
    And when the 03-contract step wrote or changed no BR, or an implement stage appended the example, no cycle runs.

  # AC-0001-0147-09
  Scenario: Each Finding Is Decided Once, By The Right Party
    Given the findings a cycle raised,
    When they are decided,
    Then the session agent, which holds the cycle, decides each finding that is not critical itself.
    And a finding that rests on product intent that no BR, no AC, the request nor the consumed deliberation record states goes to the user, and a proposed EX that no existing BR, AC or the request implies is dropped, with no EX appended and no row written.

  # AC-0001-0147-10
  Scenario: Adopted Findings Change The Tree By The Existing Routes
    Given a finding the cycle adopted,
    When its change is applied,
    Then an AC or EX this invocation wrote is changed directly, an item that existed when the invocation started changes directly only when the user's request in the session names that change and is otherwise put to the user, and creating, splitting, merging or retiring a BF or US is put to the user however recently the item was written.
    And under `--contract` a finding that only a story change answers is put to the user and leaves the story unchanged until the user answers, and after the changes the BRs are rewritten from the updated EXs.
    And a capacity-only story partition instead requires the user's decision, covering its paths, requested AC or EX additions exceeding the source story's retired-inclusive remaining 99-H at its actual observed high-water H, and a truthful cohesive scope under the same BF and actual actor goal without inventing a product outcome; it decides no wider semantic change or flow operation

  # AC-0001-0147-12
  Scenario: At Most Two Cycles
    Given a cycle has ended,
    When the next cycle is considered,
    Then a cycle that adopted nothing ends the loop, a second cycle follows only a first cycle that adopted a finding, and no third cycle runs.
    And a finding that has no decision when the loop ends becomes an `open-questions.md` row whose Content opens `Unadjudicated:`, pending while the row exists.

  # AC-0001-0147-13
  Scenario: A Decided Finding Is Not Raised Again
    Given a finding the session already decided, or a change the user declined,
    When a later cycle of the session looks for findings,
    Then the finder raises no finding that has the kind and target IDs of a finding the session already decided and a case equal to, including or included in that finding's case, and no finding that a change the user declined already answers.
    And a decided or dropped finding appends no row; only a finding still undecided when the session ends becomes an `open-questions.md` row.
    And matching never goes by wording, and a decision row whose Approach opens `Reopens DEC-…` with the ID of a `Declined:` row the register holds lifts that row.

  # AC-0001-0147-15
  Scenario: A Pre-draft Grilling Checkpoint Precedes Each Design Write
    Given an invocation of `/qfai-sdd` about to write in a design-writing stage,
    When the stage makes its first story-tree write,
    Then a grilling checkpoint has gathered that stage's open decisions, and a delegated session has settled each one the repository cannot settle, a critical one by the user's answer.
    And a checkpoint that finds no open decision holds no session and starts no griller.
    And each decision the checkpoint adopted is an Agent decisions row of the run's deliberation record.

  # AC-0001-0147-16
  Scenario: A capacity partition preserves truthful scope and case identity
    Given the requested additions for an actual AC or EX kind exceed the source story's retired-inclusive remaining 99-H at its observed high-water H under the unchanged grammar
    When the owner considers a capacity-only partition or an actual case move
    Then it records the kind, source story, observed H, remainder and requested count, and additions that fit the original scope do not qualify for this exception
    And it first preserves existing published cases and IDs and prefers a cohesive incoming group in a capacity-checked sibling story within the same BF
    And only the user's decision of the partition and its affected paths permits that narrow creation exception under the same actual actor goal without inventing a new product outcome
    And truthful cohesive scope and criterion ownership are settled before writing, without silently duplicating or weakening obligations
    And a different actor, goal, flow or intended behavior is its own critical decision, and no truthful partition or insufficient destination capacity stops the dependent write
    And an actual move or incoming collision repair has a complete one-to-one map binding fixed source commit and paths and original identity and meaning to destination story and AC and EX identity and paths, active BR citations and every counted adjacent test declaration, with unchanged cases identified
    And case inputs, expected outcomes and executable assertions are preserved, destination links and counted test obligations remain complete, and both scopes' retired-inclusive capacity is checked
    And moved old IDs are named as retired in the stage report and the commit message and never reissued, while inherited published decision IDs and their historical references stay unchanged, the wording of a row free to be restated
    And only the active references the map covers and provably incoming collision items change, without blanket replacement or claiming completion from an ID change
    And an incomplete map, ambiguous ownership or collision, missing counted link, uncovered declaration or changed assertion stops the move, with no new executor or schema

  # AC-0001-0147-17
  Scenario: A Conflict Confined To The Registers Is Resolved By Merging The Base
    Given a branch whose rows in `decisions.md` or `open-questions.md` conflict with rows the base gained after the branch started,
    When `/qfai-sdd` brings the branch up to date with its base,
    Then it runs `git merge` of the fetched base locally, the union merge keeps the rows of both sides, and it pushes the merge.
    And no row is renumbered, edited or moved.

  # AC-0001-0147-18
  Scenario: A Decision's Result Lives In One Place, As The Current State
    Given a decision the user made that changes the story tree,
    When `/qfai-sdd` writes its result,
    Then the result is written in place where it lives, as the current state: one statement per concept with at most one sentence of reason, and no date, approver, quoted request or history.
    And it goes to `01_policy/` only when it binds more than one flow or the whole product; a non-functional requirement is a contract BR with a measurable threshold and an example, and only a product-wide one goes to `constraint.md`.
    And a trivial edit adds no policy or constraint entry and no decision row.
```
