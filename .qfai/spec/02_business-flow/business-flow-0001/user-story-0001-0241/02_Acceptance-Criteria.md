# Acceptance Criteria

## Criteria

```gherkin
Feature: Check that discussion-pack citations resolve

  # AC-0001-0241-01
  Scenario: Report a citation of a missing file
    Given the latest discussion pack cites a path and a line, and no file exists at that path under the project root
    When I run qfai validate
    Then an error names the pack file, its line and the citation

  # AC-0001-0241-02
  Scenario: Report a line past the end of the file
    Given the latest discussion pack cites a line or a line range of an existing file, and the line or the range end is past the file's last line
    When I run qfai validate
    Then an error names the pack file, its line, the citation and the file's line count

  # AC-0001-0241-03
  Scenario: Accept a citation that resolves
    Given every citation in the latest discussion pack names an existing file and lines within it, and the pack also holds URLs
    When I run qfai validate
    Then no citation error is raised
```
