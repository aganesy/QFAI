# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0053-01
# Parent: US-0001-0053
Scenario: AC-0001-0053-01
  Given a project whose `paths.specsDir` holds no `spec-*/` and no `_policies/` directory (the story tree)
  When `qfai validate --profile sdd` runs
  Then the story-tree finding families run on it and the spec-pack validators report nothing about it
  And A `paths.specsDir` that holds a `spec-*/` or `_policies/` directory beside story-tree files is read as the spec-pack layout, and no story-tree finding family runs on it

# AC-0001-0053-02
# Parent: US-0001-0053
Scenario: AC-0001-0053-02
  Given the story tree, and a `user-story-NNNN-NNNN/` directory that lacks `01_User-story.md`, `02_Acceptance-Criteria.md` or `03_Example.md`, holds any other file, or holds a subdirectory
  When `qfai validate --profile sdd` runs
  Then an error names the directory and each missing or extra entry
  And A story directory holding exactly the three files raises no such error

# AC-0001-0053-03
# Parent: US-0001-0053
Scenario: AC-0001-0053-03
  Given the story tree, and an ID the tree defines that does not match its shape — `BF-NNNN`, `US-NNNN-NNNN`, `AC-NNNN-NNNN-NN`, `EX-NNNN-NNNN-NN`, `BR-NNNN`, `DEC-NNNN` or `OQ-NNNN`
  When `qfai validate --profile sdd` runs
  Then an error names the ID and the file that defines it

# AC-0001-0053-04
# Parent: US-0001-0053
Scenario: AC-0001-0053-04
  Given the story tree, and an ID of one of the seven shapes defined in more than one place
  When `qfai validate --profile sdd` runs
  Then one error names the ID and every file that defines it

# AC-0001-0053-05
# Parent: US-0001-0053
Scenario: AC-0001-0053-05
  Given the story tree, and a story ID that does not start with its flow's number, an AC or EX ID that does not start with its story's ID, or a `business-flow-NNNN/` or `user-story-NNNN-NNNN/` directory whose name does not match the ID it holds
  When `qfai validate --profile sdd` runs
  Then an error names the ID and the file that defines it
```
