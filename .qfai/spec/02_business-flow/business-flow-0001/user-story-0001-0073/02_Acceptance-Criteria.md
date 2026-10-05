# Acceptance Criteria

## Criteria

```gherkin
Feature: Scaffold acceptance tests in bulk
  # AC-0001-0073-01
  Scenario: A story gets one empty passing test per criterion
    Given a story `US-NNNN-NNNN` with its ACs
    When `qfai atdd scaffold --story US-NNNN-NNNN` runs with no pre-existing tests
    Then for every AC of the story a file `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>` is written carrying `QFAI:AC-NNNN-NNNN-NN`
    And each test is not skipped, has an empty body and passes

  # AC-0001-0073-02
  Scenario: Re-running the scaffold overwrites nothing
    Given a story or flow test whose body is empty or written
    When `qfai atdd scaffold --story US-NNNN-NNNN` or `--flow BF-NNNN` is re-run for that scope
    Then the existing file is not overwritten and no new file is written

  # AC-0001-0073-03
  Scenario: The scaffold writes one empty passing test for a business flow
    Given a project on the story tree and a business flow `BF-NNNN` it defines
    When `qfai atdd scaffold --flow BF-NNNN` runs with no pre-existing test for that flow
    Then one file `<testsDir>/e2e/<BF-ID>.test.<ext>` is written carrying `QFAI:BF-NNNN`, not skipped, with an empty body that passes
    And a second run writes nothing

  # AC-0001-0073-04
  Scenario: Invalid scaffold targets write nothing
    Given neither or both of `--story` and `--flow` are given, an ID is malformed, or an ID names nothing the tree defines
    When `qfai atdd scaffold` runs
    Then the command exits 2 and writes nothing, and `--spec` exits 2 with a message naming `--story` and `--flow`.

  # AC-0001-0073-05
  Scenario: An empty test raises no finding, and a skipped one does
    Given a test `qfai atdd scaffold` wrote
    When `qfai validate` runs
    Then an empty body raises no finding
    And a skipped test raises `QFAI-TEST-003`
```
