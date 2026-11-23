# Acceptance Criteria

## Criteria

```gherkin
Feature: Warn about legacy patterns a Widely available feature replaces
  # AC-0001-0316-01
  Scenario: A script from another origin with no integrity attribute is a warning
    Given a selected `.html`, `.tsx`, `.jsx`, `.vue` or `.svelte` surface file with a `<script>` element whose literal `src` is an absolute `http:` or `https:` URL or starts with `//`
    When `qfai validate` runs in the `prototyping`, `saas-package`, `verify` or `full` profile
    Then it raises `QFAI-LEGACY-001` at warning at the element's line, naming the `src`, when the element carries no `integrity` attribute
    And a script with `integrity`, a same-origin or non-literal `src`, a component named `Script` and a script inside a comment raise none
    And the other five profiles raise none

  # AC-0001-0316-02
  Scenario: Error styling on `:invalid` is a warning
    Given a selected `.css` surface file, or a `<style>` element in a selected `.html`, `.vue` or `.svelte` surface file
    When `qfai validate` runs in one of those profiles
    Then it raises `QFAI-LEGACY-002` at warning at the line of each `:invalid` pseudo-class in a selector, naming the compound selector it belongs to
    And `:user-invalid`, `:invalid` inside a functional pseudo-class, `:invalid` on a `form` or `fieldset`, and `:invalid` in a comment or a declaration raise none

  # AC-0001-0316-03
  Scenario: A hand-built modal is a warning where no component catalogue is installed
    Given a project with no component catalogue installed
    When `qfai validate` runs in one of those profiles over a selected `.html`, `.tsx`, `.jsx`, `.vue` or `.svelte` surface file whose native element carries `role="dialog"` or `aria-modal`
    Then it raises `QFAI-LEGACY-003` at warning at the element's line, naming what the element carries
    And a native `<dialog>`, a component element, an `aria-modal` whose literal is `false`, another role and a project with a catalogue installed raise none

  # AC-0001-0316-04
  Scenario: The implementation UI guidance lists the warnings
    Given a project initialised by `qfai init`
    When an agent reads the shipped implementation UI guidance
    Then it names `QFAI-LEGACY-001` to `QFAI-LEGACY-003`, the pattern each warns about, its replacement and that replacement's Baseline status
```
