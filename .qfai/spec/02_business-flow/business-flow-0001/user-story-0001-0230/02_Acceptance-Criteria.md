# Acceptance Criteria

## Criteria

```gherkin
Feature: Purposeful copy in a screen's UI contract
  # AC-0001-0230-01
  Scenario: A screen that states its supplements and structure raises no copy finding
    Given a UI contract whose screens declare `supplements` and, where a heading is shown, `structure`, with every id they name declared by the screen
    When `qfai validate` runs in the `sdd` profile
    Then it raises no `QFAI-CONTRACT-043`, `QFAI-CONTRACT-044` or `QFAI-CONTRACT-045` finding
    And `supplements: []` with no `structure` is a complete statement of a screen that shows nothing beyond its title and labels

  # AC-0001-0230-02
  Scenario: A missing or malformed definition is named
    Given a UI contract with a screen that has no `supplements`, or a `supplements` or `structure` entry that is not a mapping, lacks a key, carries a key outside its shape, or gives a `when` outside the five states
    When `qfai validate` runs in the `sdd` or the `prototyping` profile
    Then it raises `QFAI-CONTRACT-043` at error, naming the file, the screen and the entry
    And the finding says what to write instead

  # AC-0001-0230-03
  Scenario: A reference to an id the screen does not declare is named
    Given a UI contract whose screen has a group member, a group task or a supplement `near` that no element, action, primary task or group declares, or an element or action in two groups
    When `qfai validate` runs
    Then it raises `QFAI-CONTRACT-044` at error for each, naming the file, the screen and the id

  # AC-0001-0230-04
  Scenario: A text shown twice by wording alone is warned, and a necessary disclosure is not
    Given a UI contract whose screen has a group heading equal to its title, or a supplement equal to its title, a group heading, the label of what it sits near, or another supplement near the same target in the same state
    When `qfai validate` runs
    Then it raises `QFAI-CONTRACT-045` at warning for each
    And a supplement worded differently, such as a true disclosure about demo data or storage with its reason, raises nothing

  # AC-0001-0230-05
  Scenario: The shipped sample and guide show a complete screen
    Given a project initialised by `qfai init`
    When the shipped UI contract template is copied under the UI contract directory
    Then `qfai validate` raises no copy finding for it
    And its save-draft action has no supplement restating its label, while the place the draft is kept and the recovery after a failed save are declared

  # AC-0001-0230-06
  Scenario: The copy decision reaches authoring, implementation and review
    Given a project initialised by `qfai init`
    When an author, an implementer or a surface reviewer reads the shipped guidance for a UI-bearing screen
    Then the SDD contract step, the UI definition protocol, the implementation guidance and the reviewer instructions each name `supplements` and `structure` as the input to read
    And the design anti-patterns carry the three meaning patterns apart from the brand patterns, and the prototype reviewer applies them
    And a word or character count is never a verdict
```
