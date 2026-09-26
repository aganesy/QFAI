# Acceptance Criteria

## Criteria

```gherkin
Feature: Run any migration step without risk to the project

# AC-0004-0003-01
# Parent: US-0004-0003
Scenario: A step exits 2 and writes nothing when it cannot run
  Given a project on the spec-pack layout
  When a step script is run with an argument other than --dry-run, outside the project root, without the qfai package installed, or over an input it cannot read or parse
  Then it exits 2 and names the cause
  And no file in the project has changed

# AC-0004-0003-02
# Parent: US-0004-0003
Scenario: A step whose input an earlier step produces refuses to run first
  Given a project on the spec-pack layout where step 1 has not run
  When step 5 is run
  Then it exits 2, names the earlier step that has not run, and writes nothing

# AC-0004-0003-03
# Parent: US-0004-0003
Scenario: A dry run lists the operations the real run then performs
  Given a project on the spec-pack layout
  When a step is run with --dry-run and then without it
  Then the dry run changes no file
  And the operations it prints are, in order, the operations the real run prints
  And they name exactly the files the real run changes

# AC-0004-0003-04
# Parent: US-0004-0003
Scenario: Running a step again is safe
  Given a project a step has already migrated
  When the step is run again
  Then no file changes
  And given a tree that step left half migrated, running it again leaves the tree an uninterrupted run leaves

# AC-0004-0003-05
# Parent: US-0004-0003
Scenario: Nothing outside the step's write set changes
  Given a project on the spec-pack layout inside a temporary directory
  When every step runs in order
  Then every changed path is one the step's write set allows
  And no step opens a network connection

# AC-0004-0003-06
# Parent: US-0004-0003
Scenario: A step reports on standard output and exits 3 only when a person must act
  Given a project on the spec-pack layout
  When a step completes
  Then it prints its report sections as Markdown on standard output, with none under an empty section
  And it writes no report file
  And it exits 3 when its For a person section lists an item, and 0 otherwise

# AC-0004-0003-07
# Parent: US-0004-0003
Scenario: A step removes or archives what it consumed
  Given a project on the spec-pack layout
  When a step has written a source file's content to its destinations
  Then the source file is gone from the old layout
  And a source file holding content with no destination is kept under the migration's retired archive
  And a directory left empty is removed
```
