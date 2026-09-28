# Acceptance Criteria

## Criteria

```gherkin
Feature: ATDD Scaffold Bulk Skeleton Generation
  # AC-0001-0075-01
  Scenario: A story gets one skeleton per criterion
    Given a story `US-NNNN-NNNN` with its ACs
    When `qfai atdd scaffold --story US-NNNN-NNNN` runs with no pre-existing skeletons
    Then for every AC of the story a file `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>` is written carrying `QFAI:AC-NNNN-NNNN-NN`, and `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning), keyed by the AC ID, for each file whose placeholder is still present.

  # AC-0001-0075-02
  Scenario: Re-running the scaffold overwrites nothing
    Given a story or flow skeleton whose TODO marker has been replaced with a real assertion
    When `qfai atdd scaffold --story US-NNNN-NNNN` or `--flow BF-NNNN` is re-run for that scope
    Then the existing file is not overwritten and no new file is written

  # AC-0001-0075-03
  Scenario: ATDD Scaffold Emits a Business-Flow Skeleton
    Given a project on the story tree and a business flow `BF-NNNN` it defines
    When `qfai atdd scaffold --flow BF-NNNN` runs with no pre-existing skeleton for that flow
    Then one file `<testsDir>/e2e/<BF-ID>.test.<ext>` is written carrying `QFAI:BF-NNNN`; `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning), keyed by the BF ID, while its placeholder is still present; and a second run writes nothing.

  # AC-0001-0075-04
  Scenario: Invalid scaffold targets write nothing
    Given neither or both of `--story` and `--flow` are given, an ID is malformed, or an ID names nothing the tree defines
    When `qfai atdd scaffold` runs
    Then the command exits 2 and writes nothing, and `--spec` exits 2 with a message naming `--story` and `--flow`.

  # AC-0001-0075-05
  Scenario: An unfilled placeholder escalates to an error
    Given an AC or BF skeleton whose placeholder remains unremoved across 3 `qfai validate` cycles (the `atdd.scaffoldEscalateCycles` default)
    When the 3rd validation cycle runs
    Then `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error for that AC or BF ID (configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`).
```
