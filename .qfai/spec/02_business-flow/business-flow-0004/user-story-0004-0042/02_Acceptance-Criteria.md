# Acceptance Criteria

## Criteria

```gherkin
Feature: A migrated project is told which of its own files still name a 1.x path
  # AC-0004-0042-01
  Scenario: Step 12 lists each line of a project file that names a 1.x path
    Given a migrated git project with tracked files the project wrote that name 1.x paths
    When step 12 runs
    Then each such line is one item under `## For a person` naming `old-path`, the file and line as `<file>:<line>`, and each 1.x path the line names
    And it changes no file and exits 3

  # AC-0004-0042-02
  Scenario: Step 12 leaves out what it does not scan
    Given a file under `.qfai/` or under the configured spec or contract directory, the file `qfai init` writes about the retired layout, a symbolic link, a binary file, a path that is no regular file in the working tree, and a file git does not track, each carrying or leading to a 1.x path
    When step 12 runs
    Then none of them is listed, and a file a link leads to is listed once, under its own path

  # AC-0004-0042-03
  Scenario: The report shows that the scan ran
    Given a migrated project whose project files name no 1.x path, and one that is not a git repository
    When step 12 runs on each, with and without `--dry-run`
    Then `## Files scanned` states how many files the first run checked and that the second did not check any because the project is not a git repository
    And each run changes no file and exits 0

  # AC-0004-0042-04
  Scenario: The guide says what is not rewritten and what each path is now
    Given the shipped guide and `SKILL.md` of the migration skill
    When an AI reaches the items step 12 lists
    Then they say the migration does not rewrite a skill, agent or document the project wrote, and give the 2.x path of each 1.x path step 12 names
    And `SKILL.md` directs the AI to resolve each `old-path` item with the person who wrote the file

  # AC-0004-0042-05
  Scenario: Step 12 does not report a scan it could not make
    Given a git repository whose index git cannot read
    When step 12 runs
    Then it exits 2 with git's message and does not say that the project is not a git repository
```
