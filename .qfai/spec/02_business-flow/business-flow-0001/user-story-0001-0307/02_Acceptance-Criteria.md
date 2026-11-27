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
    And generation succeeds as above at or below 8388608 UTF-8 bytes. Above the limit it exits 1 naming the limit, tells the reader how to reduce the selected component metadata, and leaves any existing catalogue as it was

  # AC-0001-0307-02
  Scenario: The check mode compares and writes nothing
    Given a project with `.tsx` components that `uiux.surfacePaths` selects
    When `qfai catalog components --check` runs
    Then it exits 0 when the committed catalogue is the file the command would write, line ends aside
    And it exits 1 naming the file when the catalogue is missing or differs, and leaves the file as it was
    And it exits 1 with the path and limit when the catalogue exceeds 8388608 bytes or grows past that limit during the read. It reads from the verified descriptor and requests no byte past the limit plus one. It makes no comparison or write

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
    And a catalogue path with a symbolic link, including a broken link, or an existing catalogue entry that cannot be read as a regular file also raises one `QFAI-COMP-004` at warning naming the reason, without reading through the link
    And a catalogue above 8388608 bytes is unreadable and raises the same warning naming the byte limit and how to reduce the selected component metadata
    And a missing catalogue on an otherwise allowed path raises no `QFAI-COMP` finding other than `QFAI-COMP-005` where a registry is declared, and the other profiles raise none

  # AC-0001-0307-07
  Scenario: The implementer reads the catalogue and keeps it current
    Given a project initialised by `qfai init`
    When an agent reads the shipped implementation UI guidance, the procurement ladder and the test-first implementation step
    Then the UI guidance says to read `.qfai/catalog/components.yaml` before writing a region, to reuse a listed component, and, on authoring a component, to write its doc comment with the tags and run `qfai catalog components`
    And the procurement ladder's first rung and the implementation step point to that guidance

  # AC-0001-0307-08
  Scenario: The catalogue is written only inside the project
    Given a project whose `.qfai/catalog` is a symbolic link to a directory outside it that holds a `components.yaml`
    When `qfai catalog components` runs
    Then it exits 1 with one line naming `.qfai/catalog/components.yaml` and the link, and the file outside the project is as it was with nothing written beside it
    And in a project with no such link it replaces the catalogue and leaves no temporary file in `.qfai/catalog`
    And with `--check` it exits 1 with one line naming `.qfai/catalog/components.yaml` and the link, comparing nothing

  # AC-0001-0307-09
  Scenario: A configuration the command cannot use stops it before it scans
    Given a `qfai.config.yaml` that does not parse or holds a value `qfai validate` reports as an error, and a committed catalogue
    When `qfai catalog components` runs, with or without `--check`
    Then it exits 1 naming `qfai.config.yaml` and each error, and scans, compares and writes nothing, leaving the catalogue as it was

  # AC-0001-0307-10
  Scenario: One run at a time scans and writes the catalogue
    Given a run of `qfai catalog components` that is still writing the catalogue
    When a second run starts after the source has changed
    Then the second run scans and writes nothing and exits 1 with one line saying another run holds `.qfai/tools/state/component-catalog.lock`, so the catalogue is the first run's
    And a lock whose owner is not running is left as it was and named for removal by hand, and a lock that no longer holds the run's record at the end is left in place and named in its one line

  # AC-0001-0307-11
  Scenario: Each component lists the business rules its declaration cites
    Given exported components whose declarations hold standalone `QFAI:BR-UI-` comment lines, and one that cites none
    When `qfai catalog components` runs
    Then each entry records `realizes` with the IDs its own declaration cites, once each and sorted, as its last key, and the component that cites none has no `realizes` key
    And an ID inside a single-line string, after code on the same line, or in another declarator of the same `const` list is not recorded
    And the shipped implementation UI guidance says to carry the rule's comment inside the declaration of the component that realises it or on its leading comment lines and to look up `realizes` before writing a region for a rule

  # AC-0001-0307-12
  Scenario: Each component lists the string literal values its props take
    Given exported components whose props types hold members typed as a string literal union, as a same-file alias of one and as other types, and one whose props are only destructured
    When `qfai catalog components` runs
    Then each entry with such a member records `variants` right after `props`, mapping each such member, in the order `props` lists it, to its literal values as written, `undefined` and `null` aside
    And a member whose type is imported, mixed or a single literal records no variant, and an entry with none, a destructured one included, has no `variants` key
    And a committed catalogue whose `variants` is not a mapping from names to lists of strings is reported as malformed
    And the shipped implementation UI guidance says to pass one of a prop's listed `variants` values rather than restyling the component

  # AC-0001-0307-13
  Scenario: Each component lists the theme variables its declaration references
    Given exported components whose declarations reference CSS custom properties through `var(--name)` in strings, template literals, style objects and Tailwind arbitrary values, and one that uses only a theme utility class
    When `qfai catalog components` runs
    Then each entry records `tokens` with the names its own declaration references, once each and sorted, right before `realizes`, and the component that references none has no `tokens` key
    And a name referenced in another declarator of the same `const` list is not recorded, and a catalogue whose `tokens` is not a list of names is reported as not a components list
    And the shipped implementation UI guidance says to reference a theme value by its variable through `var(--…)` so that `tokens` lists it

  # AC-0001-0307-14
  Scenario: A shipped base catalogue describes the parts most products need before a project builds them
    Given the assistant tree `qfai init` installs
    When an implementer is about to build an error summary, a field with an error, a step indicator, a confirm step, a skip link, a sticky action bar, a status message or an empty state
    Then `.qfai/assistant/rule/references/base-components.yaml` holds one entry for that part, with a unique kebab-case `id` and exactly the keys of its closed shape: purpose, anatomy, role, accessible name, keyboard, focus, states with how each renders, content rules, runtime notes on server rendering, content security policy and no-script, and sources
    And the shipped implementation UI guidance and the procurement rule's reuse rung tell the implementer to read that entry, build the part once as a shared component and name the entry's `id` in its `@pattern`, and the guidance also says to give it `@source authored` with an `@reason` naming that `id`

  # AC-0001-0307-15
  Scenario: An agent's brief carries the committed catalogue
    Given a committed `.qfai/catalog/components.yaml` and design token file
    When `qfai catalog components --brief` runs
    Then it writes nothing and prints one line per listed component with its name, file and every other key it holds, and one line with the token count and the theme
    And a missing, invalid or unreadable catalogue, or a token file or theme that exists but cannot be read, exits 1 with one line naming that file
    And `--brief` with `--check` is a usage error that exits 2
    And the shipped implementation UI guidance and the prototyping generator prompt say to include that output in a screen unit's brief
```
