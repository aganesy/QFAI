# Acceptance Criteria

## Criteria

```gherkin
Feature: Every plain text on a screen states why it is there
  # AC-0001-0297-01
  Scenario: A plain text without a reason fails
    Given a prototype page or a file `uiux.surfacePaths` selects, holding a literal text outside every exempt element, sample data included
    And no `qfai-text` comment comes directly before the text or before its parent element
    When `qfai validate` runs in the `prototyping`, `saas-package`, `verify` or `full` profile
    Then it raises `QFAI-UITEXT-001` at error, naming the file, the line and the first 40 characters of the text
    And the finding says to delete the text, replace it with another component, move its job to an existing element, or write the reason
    And the other profiles raise no `QFAI-UITEXT` finding

  # AC-0001-0297-02
  Scenario: A reason that leaves out what is asked fails
    Given a plain text preceded by a `qfai-text` comment
    When the comment lacks `why` or `without`, leaves either empty, repeats a key, carries another key or a part with no `=`, or gives both the same words
    Then `qfai validate` raises `QFAI-UITEXT-002` at error, naming the file, the line and the defect, and no `QFAI-UITEXT-001` for that text
    And a comment with a non-empty `why` and a different non-empty `without` raises nothing, and a `qfai-text` comment before no plain text raises nothing

  # AC-0001-0297-03
  Scenario: Text that names, labels or reports is not checked
    Given UI source whose literal text sits only in `h1` to `h6`, `label`, `button`, `a`, `legend`, `th`, `caption`, `option`, `summary`, `title`, `script` or `style`, in an element with `role="alert"` or `role="status"`, in an attribute value, or in an expression
    When `qfai validate` runs
    Then it raises no `QFAI-UITEXT` finding

  # AC-0001-0297-04
  Scenario: The files read are the current prototype and the declared surface
    Given a project with prototype iterations under `.qfai/prototype/` and `uiux.surfacePaths` globs
    When `qfai validate` runs
    Then it reads `final/index.html` and the `index.html` of the highest-numbered `iter-NN/`, and every `.html`, `.tsx`, `.jsx`, `.vue` and `.svelte` file the globs select that is not a test, spec or story file
    And a project with neither raises no `QFAI-UITEXT` finding

  # AC-0001-0297-05
  Scenario: JSX needs the TypeScript compiler the project installs
    Given a selected `.tsx` or `.jsx` file in a project where `typescript` cannot be resolved or offers no compiler API
    When `qfai validate` runs
    Then it raises one `QFAI-UITEXT-003` at error naming the package to install and the number of files it could not read
    And it still reads every other selected file

  # AC-0001-0297-06
  Scenario: The duty reaches the agents that write and review screens
    Given a project initialised by `qfai init`
    When an agent reads the shipped prototyping, implementation, contract and reviewer guidance for a screen
    Then the prototyping generator, the implementation UI guidance and the `fullstack-engineer` card state the `qfai-text` comment and the four remedies, with deletion first
    And the prototype reviewer and the `product-surface-reviewer` card judge each reason and the `supplements` and `structure` a UI contract describes, as review findings and not as validate findings
```
