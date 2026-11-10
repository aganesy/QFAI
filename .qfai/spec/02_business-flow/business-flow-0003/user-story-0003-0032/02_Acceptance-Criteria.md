# Acceptance Criteria

## Criteria

```gherkin
Feature: Assistant asset size checks
  # AC-0003-0032-01
  Scenario: A skill body over the code-point limit is reported
    Given a project whose `.qfai/assistant/` holds a `SKILL.md` whose body after the YAML frontmatter is longer than 20,000 code points, or whose frontmatter never closes and whose whole text is
    When `qfai doctor` runs
    Then the `assets.lineBudget` check is a `warning` that names the file and its size, and says to move a section into the skill's `references/` behind a pointer that says when to read it
    And a body of 20,000 code points or fewer, a 20,000-code-point body written with CRLF line endings, and a reference file of any size raise no such finding

  # AC-0003-0032-02
  Scenario: What init makes an agent load in every session stays within its budget
    Given the init tree the package ships
    When its always-loaded text is measured in code points
    Then the section init owns in `AGENTS.md`, every reminder text and brief form, the reminders the first prompt of a session can carry, every wired reminder once, and the skill listing are each within their ceiling
    And every reminder in `.agents/rules/reminders.json` is run by a hook init wires
```
