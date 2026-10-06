# Acceptance Criteria

## Criteria

```gherkin
Feature: Story-tree layout and ID validation
  # AC-0001-0051-01
  Scenario: The story tree runs the story-tree validators
    Given a project whose `paths.specsDir` holds no `spec-*/` and no `_policies/` directory (the story tree)
    When `qfai validate --profile sdd` runs
    Then the story-tree finding families run on it and the spec-pack validators report nothing about it
    And a `paths.specsDir` that holds a `spec-*/` or `_policies/` directory beside story-tree files raises `QFAI-LAYOUT-001` as the only finding, and no other validator runs

  # AC-0001-0051-02
  Scenario: A story directory without exactly its three files is reported
    Given the story tree, and a `user-story-NNNN-NNNN/` directory that lacks `01_User-story.md`, `02_Acceptance-Criteria.md` or `03_Example.md`, holds any other file, or holds a subdirectory
    When `qfai validate --profile sdd` runs
    Then an error names the directory and each missing or extra entry
    And a story directory holding exactly the three files raises no such error

  # AC-0001-0051-03
  Scenario: A malformed ID is reported
    Given the story tree, and an ID the tree defines that does not match its shape — `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN` or `OQ-NNNN`
    When `qfai validate --profile sdd` runs
    Then an error names the ID and the file that defines it

  # AC-0001-0051-04
  Scenario: An ID defined twice is reported
    Given the story tree, and an ID of one of the seven shapes defined in more than one place
    When `qfai validate --profile sdd` runs
    Then one error names the ID and every file that defines it

  # AC-0001-0051-05
  Scenario: An ID out of place is reported
    Given the story tree, and a story ID that does not start with its flow's number, an AC or EX ID that does not start with its story's ID, or a `business-flow-NNNN/` or `user-story-NNNN-NNNN/` directory whose name does not match the ID it holds
    When `qfai validate --profile sdd` runs
    Then an error names the ID and the file that defines it

  # AC-0001-0051-06
  Scenario: A constraint ID out of sequence is reported
    Given the story tree, and a row of `01_policy/constraint.md` whose ID is not its section's prefix followed by its place in the table, counted from 01
    When `qfai validate --profile sdd` runs
    Then an error names the ID and the ID its place gives
    And a constraint document whose IDs run from 01 in each section raises no such error

  # AC-0001-0051-07
  Scenario: An architecture whose diagram and table disagree is reported
    Given the story tree, and a `tech.md` whose Architecture table has a Depends on entry that is not a layer in a row below its own, or whose diagram draws a layer or an edge the table does not give, or leaves one out
    When `qfai validate --profile sdd` runs
    Then an error names `tech.md` and each disagreement
    And an architecture whose rows run from the uppermost layer down, and whose diagram draws exactly its layers and dependencies, raises no such error

  # AC-0001-0051-08
  Scenario: A path outside .qfai is counted for each tree
    Given the story tree, and Markdown documents that name a file by a repository path that does not start with `.qfai/`
    When `qfai validate --profile sdd` runs
    Then one warning for each of the policy, business-flow, contract, and decision and open-question trees counts its lines and its files
    And a path under `.qfai`, a URL, and a discussion pack raise nothing
```
