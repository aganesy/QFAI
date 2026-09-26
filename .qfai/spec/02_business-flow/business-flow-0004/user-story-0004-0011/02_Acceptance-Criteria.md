# Acceptance Criteria

## Criteria

```gherkin
Feature: Repoint the host links and the ignore rules

# AC-0004-0011-01
# Parent: US-0004-0011
Scenario: The host integration links follow the singular directories
  Given a project whose host integration links point at the plural skill and agent directories
  When step 9 runs
  Then each link points at the singular directory
  And no other file changes and qfai init --force is not run
  And an occupied user-owned wrapper or obsolete roster is left unchanged and listed under For a person with exit 3
  And a path step 9 cannot inspect ends the run with exit 2 before any write

# AC-0004-0011-02
# Parent: US-0004-0011
Scenario: The managed .gitignore block matches the installed package's
  Given a project whose managed .gitignore block negates the plural decision-record directory
  When step 10 runs
  Then the managed block equals the one the installed package writes
  And git check-ignore reports a path under .qfai/evidence/decision/ ignored

# AC-0004-0011-03
# Parent: US-0004-0011
Scenario: Step 10 removes every negation that re-includes the evidence directory
  Given a .gitignore holding negations of paths under .qfai/evidence/ inside and outside its managed block, and a legacy .qfai/evidence/.gitignore
  When step 10 runs
  Then no line of .gitignore re-includes a path under .qfai/evidence/, and every other line outside the managed block is unchanged
  And the legacy .qfai/evidence/.gitignore is deleted when it is a regular file, and listed under For a person with exit 3 otherwise
  And the report names each removed line and the deletion

# AC-0004-0011-04
# Parent: US-0004-0011
Scenario: Step 10 removes the evidence directory from the git index
  Given a git repository whose index tracks files under .qfai/evidence/
  When step 10 runs
  Then the index holds nothing under .qfai/evidence/ and every one of those files stays on disk
  And nothing is committed, and the report states how many paths left the index

# AC-0004-0011-05
# Parent: US-0004-0011
Scenario: Step 10 leaves the git index alone when there is nothing to remove
  Given a project that is not a git repository, or whose git index tracks nothing under .qfai/evidence/
  When step 10 runs
  Then the git index is unchanged
  And the report states why nothing left the index, with no item for a person

# AC-0004-0011-06
# Parent: US-0004-0011
Scenario: Step 10's change to the git index is safe to preview and repeat
  Given a git repository whose index tracks files under .qfai/evidence/
  When step 10 runs with --dry-run, then without it, then again
  Then the dry run changes neither a file nor the git index, and reports how many paths the real run removes from it
  And the last run changes neither a file nor the git index
```
