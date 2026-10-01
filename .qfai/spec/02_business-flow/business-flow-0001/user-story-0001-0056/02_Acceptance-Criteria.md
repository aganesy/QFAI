# Acceptance Criteria

## Criteria

```gherkin
Feature: Layer-specific test obligations
  # AC-0001-0056-01
  Scenario: A business flow without an E2E test is reported
    Given the story tree, and a BF that no file under the E2E layer (`<paths.testsDir>/e2e/**`) annotates with `QFAI:BF-NNNN`, and no `Test exception:` row in force naming it
    When `qfai validate --profile atdd` runs
    Then an error names the BF ID and the `business-flow.md` that defines it
    And an annotation of that BF in a file outside the E2E layer does not satisfy the obligation

  # AC-0001-0056-02
  Scenario: A criterion without an integration or API test is reported
    Given the story tree, and an AC that no file under the integration or API layer (`<paths.testsDir>/integration/**`, `<paths.testsDir>/api/**`) annotates with `QFAI:AC-NNNN-NNNN-NN`, and no `Test exception:` row in force naming it
    When `qfai validate --profile atdd` runs
    Then an error names the AC ID and the `02_Acceptance-Criteria.md` that defines it
    And an annotation of that AC in a file outside those two layers does not satisfy the obligation

  # AC-0001-0056-03
  Scenario: An example without a test is reported
    Given the story tree, and an EX that no file `validation.traceability.testFileGlobs` selects annotates with `QFAI:EX-NNNN-NNNN-NN`, and no `Test exception:` row in force naming it
    When `qfai validate --profile tdd` runs
    Then an error names the EX ID and the `03_Example.md` that defines it
    And an annotation counts only on a comment directly before a test declaration such as `it(`, `test(` or `describe(`, with nothing but blank and comment lines between them

  # AC-0001-0056-04
  Scenario: An annotation in the wrong layer is reported
    Given the story tree, and a `QFAI:BF-NNNN` annotation in a file outside the E2E layer, or a `QFAI:AC-NNNN-NNNN-NN` annotation in a file outside the integration and API layers
    When `qfai validate --profile atdd` runs
    Then an error names the file and the annotation

  # AC-0001-0056-05
  Scenario: An annotation naming an undefined ID is reported
    Given the story tree, and a `QFAI:BF-NNNN`, `QFAI:AC-NNNN-NNNN-NN` or `QFAI:EX-NNNN-NNNN-NN` annotation naming an ID the tree does not define
    When `qfai validate --profile atdd` or `qfai validate --profile tdd` runs
    Then an error names the file and the ID

  # AC-0001-0056-06
  Scenario: A test exception in force exempts only the named item
    Given the story tree, and a `decisions.md` row opening `Test exception:` that names a BF, AC or EX which has no test at its layer
    When `qfai validate --profile atdd` or `qfai validate --profile tdd` runs
    Then while the row's Status is DONE, the named item raises no test-obligation error and is listed at info with the row's DEC ID; at any other Status the error stands
    And the row exempts only the obligation of the named ID's own shape: exempting a BF leaves the ACs of its stories owed, and exempting an AC leaves its EXs owed
    And a named ID the tree does not define exempts nothing, and the row raises no other finding
```
