# Acceptance Criteria

## Criteria

```gherkin
Feature: Take interactive widgets from a tested source
  # AC-0001-0310-01
  Scenario: A hand-written dialog, menu or tab list is a warning where a catalogue is installed
    Given a project whose `uiux.registries` declares a valid entry, or whose committed component catalogue lists a component with a `@source` other than `authored`
    When `qfai validate` runs in the `prototyping`, `saas-package`, `verify` or `full` profile over a selected `.tsx` or `.jsx` surface file whose intrinsic element carries `role="dialog"`, `role="menu"`, `role="tablist"` or `aria-modal`
    Then it raises `QFAI-COMP-005` at warning at the element's line, naming what the element carries
    And the file of a catalogued component whose `@source` is a catalogue item raises none, a component element raises none, and a project with no catalogue installed raises none

  # AC-0001-0310-02
  Scenario: A listed interactive widget with no accessibility notes is a warning
    Given a committed component catalogue
    When `qfai validate` runs in one of those profiles
    Then it raises `QFAI-COMP-006` at warning on the component's file for each component whose `@pattern` is one of the listed widgets and that records no `@a11y`, naming the component and the pattern
    And a component whose pattern is not a listed widget, or that records an `@a11y`, raises none

  # AC-0001-0310-03
  Scenario: The procurement rule names the widgets that are not hand-authored
    Given a project initialised by `qfai init`
    When an agent reads the shipped procurement rule
    Then it lists dialog, alert dialog, drawer or sheet, menu and menu button, tabs, combobox and autocomplete, listbox and select, tooltip, popover, toast, date picker, and disclosure and accordion, each with its WAI-ARIA Authoring Practices pattern, as taken from a catalogue or headless library and skipping the compose-from-primitives rung
    And it says an authored one records the pattern and its keyboard behaviour in the component's `@a11y` tag with a test covering that behaviour, and the procurement record names them
```
