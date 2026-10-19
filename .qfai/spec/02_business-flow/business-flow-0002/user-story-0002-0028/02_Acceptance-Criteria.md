# Acceptance Criteria

## Criteria

```gherkin
Feature: Relative links in the instruction tree resolve
  # AC-0002-0028-01
  Scenario: A link whose target is gone fails the lint lane
    Given a Markdown file under `.instruction/` holds an inline link or a reference definition outside code
    When its relative target, resolved against the linking file's directory, does not exist or lies outside the repository
    Then the link check exits 1 naming the file, the line and the target
    And the pull request lint lane runs that check

  # AC-0002-0028-02
  Scenario: Links that resolve, and text that is not a relative link, pass
    Given every relative link under `.instruction/` resolves
    When the tree also holds URLs, same-file anchors, footnotes, code spans, HTML comments and fenced or indented code blocks
    Then the link check exits 0 and reports how many links it checked
    And a missing `.instruction/` tree, or a symbolic link under it, exits 2
```
