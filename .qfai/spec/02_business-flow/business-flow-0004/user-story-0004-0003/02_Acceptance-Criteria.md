# Acceptance Criteria

## Criteria

```gherkin
Feature: Run any migration step without risk to the project
  # AC-0004-0003-01
  Scenario: A step exits 2 and writes nothing when it cannot run
    Given a project on the spec-pack layout
    When a step script is run with an argument other than --dry-run, outside the project root, without the qfai package installed, or over an input it cannot read or parse
    Then it exits 2 and names the cause
    And no file in the project has changed

  # AC-0004-0003-02
  Scenario: A step whose input an earlier step produces refuses to run first
    Given a project on the spec-pack layout where step 1 has not run
    When step 5 is run
    Then it exits 2, names the earlier step that has not run, and writes nothing

  # AC-0004-0003-03
  Scenario: A dry run lists the operations the real run then performs
    Given a project on the spec-pack layout
    When a step is run with --dry-run and then without it
    Then the dry run changes no file, its report file aside
    And the operations it prints are, in order, the operations the real run prints
    And they name exactly the files the real run changes

  # AC-0004-0003-04
  Scenario: Running a step again is safe
    Given a project a step has already migrated
    When the step is run again
    Then no file changes
    And given a tree that step left half migrated, running it again leaves the tree an uninterrupted run leaves
    And step 10 leaves in place, and lists under For a person, any staging file it cannot verify as its own
    And on a project whose migration finished, steps 1 to 10 say that the migration is already done
    And once no spec pack is left, steps 4 and 7 need no plan.yaml

  # AC-0004-0003-05
  Scenario: Nothing outside the step's write set changes
    Given a project on the spec-pack layout inside a temporary directory
    When every step runs in order
    Then every changed path is one the step's write set allows
    And no step opens a network connection

  # AC-0004-0003-06
  Scenario: A step reports on standard output, keeps the report and exits 3 only when a person must act
    Given a project on the spec-pack layout
    When a step completes
    Then it prints its report sections as Markdown on standard output, with none under an empty section
    And it writes the same report and its exit code to a file under the migration evidence's report directory, a dry run and a real run in separate directories
    And that report file is left out wherever a criterion or example says a step writes nothing or changes no file
    And it exits 3 when its For a person section lists an item, and 0 otherwise

  # AC-0004-0003-07
  Scenario: A step removes or archives what it consumed
    Given a project on the spec-pack layout
    When a step has written a source file's content to its destinations
    Then the source file is gone from the old layout
    And a source file holding content with no destination is kept under the migration's retired archive
    And a directory left empty is removed

  # AC-0004-0003-08
  Scenario: A step says what it found before it reports
    Given a project with a qfai.config.yaml
    When one of steps 1 to 10 runs to completion, in a dry run or a real run
    Then its first line says that no 1.x layout was found under the specs directory, that the migration is already done, or that a 1.x layout was found and is being migrated
    And a line that found no layout names the specs directory and the value of paths.specsDir, relative to the project root
    And step 10 ends with one line saying which of the three applies and, where no layout was found, asking the person to check that the directory is where the specs live
    And steps 11 and 12 print no such line
```
