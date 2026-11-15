# Acceptance Criteria

## Criteria

```gherkin
Feature: Catalogue the components a project already has
  # AC-0001-0307-01
  Scenario: The command lists every exported component
    Given `.tsx` and `.jsx` files that `uiux.surfacePaths` selects, holding exported components with and without doc comments, test files and exports that are not components
    When `qfai catalog components` runs
    Then it writes `.qfai/catalog/components.yaml` listing each top-level function or `const` whose name starts with an upper-case letter and that holds JSX, exported on its declaration, through an `export { ... }` list or as `export default` of its name, with its name, file, props when they can be read, and the `@source`, `@reason`, `@states`, `@pattern` and `@a11y` its doc comment gives
    And it lists nothing from a test, spec or story file and no export that is not a component
    And the list is sorted by file and then by name, two runs over the same source write the same bytes, and the command prints one summary line, saying so when no `.tsx` or `.jsx` file is selected, and exits 0

  # AC-0001-0307-02
  Scenario: The check mode compares and writes nothing
    Given a project with `.tsx` components that `uiux.surfacePaths` selects
    When `qfai catalog components --check` runs
    Then it exits 0 when the committed catalogue is the file the command would write, line ends aside
    And it exits 1 naming the file when the catalogue is missing or differs, and leaves the file as it was

  # AC-0001-0307-03
  Scenario: JSX needs the TypeScript compiler the project installs
    Given a selected `.tsx` or `.jsx` file in a project where `typescript` cannot be loaded from the root
    When `qfai catalog components` runs
    Then it exits 1 with one line naming `typescript` and the number of files it could not read, and writes no catalogue

  # AC-0001-0307-04
  Scenario: A component with no source, and two components for one pattern, are warnings
    Given a committed catalogue
    When `qfai validate` runs in the `prototyping`, `saas-package`, `verify` or `full` profile
    Then it raises `QFAI-COMP-001` at warning for each component with no `@source`, or with `@source authored` and no `@reason`, that carries another catalogue tag or that another surface file imports by name, naming the component and its file
    And a component with no tag that no other surface file imports, such as a page, raises none
    And it raises one `QFAI-COMP-002` at warning for each `@pattern` two or more components name, naming each of them

  # AC-0001-0307-05
  Scenario: A raw element a listed component replaces is a warning
    Given a committed catalogue listing a component whose `@pattern` is `button`, `input` or `select`
    When `qfai validate` runs in one of those profiles over a selected surface file that renders that raw element
    Then it raises `QFAI-COMP-003` at warning at the element's line, naming the component to use
    And the component's own file raises none, an `<input>` whose literal `type` is `hidden` raises none, and an element no listed component replaces raises none

  # AC-0001-0307-06
  Scenario: A stale catalogue is a warning, and no catalogue asks nothing
    Given a project with selected `.tsx` components
    When `qfai validate` runs in one of those profiles
    Then a committed catalogue that differs from what `qfai catalog components` would write, or does not parse as a list of components, raises one `QFAI-COMP-004` at warning naming the file and the command
    And a project with no catalogue file raises no `QFAI-COMP` finding other than `QFAI-COMP-005` where a registry is declared, and the other profiles raise none

  # AC-0001-0307-07
  Scenario: The implementer reads the catalogue and keeps it current
    Given a project initialised by `qfai init`
    When an agent reads the shipped implementation UI guidance, the procurement ladder and the test-first implementation step
    Then the UI guidance says to read `.qfai/catalog/components.yaml` before writing a region, to reuse a listed component, and, on authoring a component, to write its doc comment with the tags and run `qfai catalog components`
    And the procurement ladder's first rung and the implementation step point to that guidance
```
