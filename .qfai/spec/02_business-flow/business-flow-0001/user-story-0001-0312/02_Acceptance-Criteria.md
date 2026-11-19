# Acceptance Criteria

## Criteria

```gherkin
Feature: Derive the design tokens and the theme from DESIGN.md
  # AC-0001-0312-01
  Scenario: The command writes the token file and the theme from DESIGN.md
    Given a root `DESIGN.md` whose front matter parses
    When `qfai catalog design` runs
    Then it writes `.qfai/catalog/design.tokens.json` in the Design Tokens Community Group 2025.10 format, holding each colour, the semantic surface, text, border, primary and status aliases, the font families, sizes and weights, and the spacing, radius and shadow tokens
    And it writes `.qfai/catalog/theme.css`, one Tailwind 4 `@theme` block with a custom property for each of those tokens
    And two runs over the same `DESIGN.md` write the same bytes, and the command prints one summary line and exits 0

  # AC-0001-0312-02
  Scenario: Layout and data display values reach the token file when DESIGN.md states them
    Given a root `DESIGN.md` with the optional `visual.layout` and `data_display` sections
    When `qfai catalog design` runs
    Then the breakpoints, content widths and minimum target of `visual.layout` become dimension tokens and theme properties, `table_narrow` stays out of both, and the data display formats ride as text on their token group
    And a `visual.layout` or `data_display` key or value outside the schema, or any value the theme writes holding `;`, `{` or `}`, fails the parse of `DESIGN.md`, and the theme is never written with such a value, even from a design that did not come through the parse

  # AC-0001-0312-03
  Scenario: The check mode compares and writes nothing
    Given a project with a root `DESIGN.md`
    When `qfai catalog design --check` runs
    Then it exits 0 when both committed files are the files the command would write, the theme with its line ends aside and the token file read as the JSON it holds, so its formatting and key order aside
    And it exits 1 with one line for each file that is missing or differs, naming it, and leaves the files as they were

  # AC-0001-0312-04
  Scenario: No DESIGN.md, or one that does not parse, writes nothing
    Given a project whose root `DESIGN.md` is absent or does not parse
    When `qfai catalog design` runs, with or without `--check`
    Then it exits 1 with one line saying so, a YAML syntax error included, and writes neither file

  # AC-0001-0312-05
  Scenario: A token file or theme out of date with DESIGN.md is a warning, and no design catalogue asks nothing
    Given a project with a root `DESIGN.md`
    When `qfai validate` runs in the `prototyping`, `saas-package`, `verify` or `full` profile
    Then a token file that is missing beside a theme, or differs from what the command would write, read as the JSON it holds whatever its formatting or key order, raises one `QFAI-DCAT-001` at warning naming the file and the command, and the theme likewise raises `QFAI-DCAT-002`
    And a project with neither file raises no `QFAI-DCAT` finding, and the other profiles raise none

  # AC-0001-0312-06
  Scenario: A hex colour in UI source that matches no token is a warning
    Given a committed design catalogue and selected `uiux.surfacePaths` files
    When `qfai validate` runs in one of those profiles
    Then each hex colour literal in those files that matches no colour of `DESIGN.md` raises `QFAI-DCAT-003` at warning at its line, naming the literal
    And a hex equal to a token colour, in any case or short form, and an in-page anchor such as `href="#add"`, raise none

  # AC-0001-0312-07
  Scenario: The implementer uses the theme instead of copying values
    Given a project initialised by `qfai init`
    When an agent reads the shipped implementation UI guidance and the DESIGN.md specification
    Then the UI guidance names both files, says to import the theme and use its variables instead of copying a value, and names `qfai catalog design` and the three warnings
    And the DESIGN.md specification says what the command writes from `visual.layout` and lists the `data_display` section

  # AC-0001-0312-08
  Scenario: The design catalogue is written only inside the project, by the run that owns it
    Given a project with a root `DESIGN.md` whose front matter parses
    When `qfai catalog design` runs
    Then a `.qfai/catalog` that is a symbolic link stops it with exit 1 and one line naming the link, and the directory it points to is as it was
    And it stages each file in a new file of its own, so a staging or moved-aside file of another run is never overwritten or removed
    And when a step fails it undoes only what it did, says in one line whether both files are as they were, and keeps a moved-aside file it could not rename back
```
