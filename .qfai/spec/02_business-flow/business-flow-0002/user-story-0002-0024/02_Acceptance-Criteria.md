# Acceptance Criteria

## Criteria

```gherkin
Feature: Run the init suites on Windows

# AC-0002-0024-01
# Parent: US-0002-0024
Scenario: The Windows job runs the declared suite list under a temp root with a space
  Given the own-CI workflow and the package's `test:windows-parity` script
  When the workflow tree is read
  Then a job on `windows-latest` runs that script and no other test command
  And the script's suite list is exactly the declared init and migration suites
  And every entry of the list resolves to at least one collected test file
  And before the tests the job points `TEMP` and `TMP` at a directory whose name contains a space

# AC-0002-0024-02
# Parent: US-0002-0024
Scenario: The Windows job follows change detection and joins the aggregate verdict
  Given the Windows job in the own-CI workflow
  When a pull request changes only documentation
  Then the job reports skipped under its declared name and the aggregate verdict passes
  And when a code-path pull request makes the job fail, the aggregate verdict fails
  And the job needs `detect` and carries the `test` job's detection condition verbatim
  And it appears in the aggregate verdict's `needs`

# AC-0002-0024-03
# Parent: US-0002-0024
Scenario: The Windows job builds the package on its own runner
  Given the Windows job in the own-CI workflow
  When its steps are read
  Then a build of the package precedes the first test step
  And the job neither needs the `build` job nor downloads its artifact
```
