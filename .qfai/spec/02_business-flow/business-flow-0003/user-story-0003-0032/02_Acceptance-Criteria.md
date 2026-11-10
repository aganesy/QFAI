# Acceptance Criteria

## Criteria

```gherkin
Feature: Assistant asset size checks
  # AC-0003-0032-01
  Scenario: A skill body over the character limit is reported
    Given a project whose `.qfai/assistant/` holds a `SKILL.md` whose body after the YAML frontmatter is longer than 20,000 code points
    When `qfai doctor` runs
    Then the `assets.lineBudget` check is a `warning` that names the file and its size, and says to move a section into the skill's `references/` behind a pointer that says when to read it
    And a body of 20,000 code points or fewer, a body that is the same apart from CRLF line endings, and a reference file of any size raise no such finding

  # AC-0003-0032-02
  Scenario: What init makes an agent load in every session stays within its budget
    Given the init tree the package ships
    When its always-loaded text is measured in code points
    Then the section init owns in `AGENTS.md`, every reminder, the reminders on the first prompt, the reminders in one session and the skill listing are each within their ceiling
    And the measured figures are pinned, so a change to that text without a new pin fails the package's tests
```
