# Acceptance Criteria

## Criteria

```gherkin
Feature: ATDD Scaffold Bulk Skeleton Generation

# AC-0001-0075-01
# Parent: US-0001-0075
Scenario: ATDD Scaffold Emits Per-TC Skeletons
  Given a spec `spec-NNNN` with declared test*cases
  When `qfai atdd scaffold --spec spec-NNNN` runs against a directory with no pre-existing skeletons
  Then for every TC a file `tests/atdd/spec-NNNN/<TC-ID>.test.*`is emitted that imports test-framework primitives, contains`// TODO: implement assertion for <TC-ID>`, and includes comment references to the related US-* / CON-API-\_; and `qfai validate`emits`D-SCAFFOLD-PLACEHOLDER` (severity warning) for each file whose TODO marker is still present.

Scenario: ATDD Scaffold Emits Per-TC Skeletons on the story tree
  Given a story `US-NNNN-NNNN` with its ACs
  When `qfai atdd scaffold --story US-NNNN-NNNN` runs with no pre-existing skeletons
  Then for every AC of the story a file `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>` is written carrying `QFAI:AC-NNNN-NNNN-NN`, and `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning), keyed by the AC ID, for each file whose placeholder is still present.

Scenario: ATDD Scaffold Emits Per-TC Skeletons on invalid story-tree input
  Given neither or both of `--story` and `--flow` are given, an ID is malformed, or an ID names nothing the tree defines
  When `qfai atdd scaffold` runs
  Then the command exits 2 and writes nothing, and `--spec` exits 2 with a message naming `--story` and `--flow`.

# AC-0001-0075-02
# Parent: US-0001-0075
Scenario: ATDD Scaffold Idempotency and Escalation — idempotency
  Given a story or flow skeleton whose TODO marker has been replaced with a real assertion
  When `qfai atdd scaffold --story US-NNNN-NNNN` or `--flow BF-NNNN` is re-run for that scope
  Then the existing file is not overwritten and no new file is written

Scenario: ATDD Scaffold Idempotency and Escalation — escalation
  Given an AC or BF skeleton whose placeholder remains unremoved across 3 `qfai validate` cycles (the `atdd.scaffoldEscalateCycles` default per DR-0272)
  When the 3rd validation cycle runs
  Then `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error for that AC or BF ID (configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`).

# AC-0001-0075-03
# Parent: US-0001-0075
Scenario: ATDD Scaffold Emits a Business-Flow Skeleton
  Given a project on the story tree and a business flow `BF-NNNN` it defines
  When `qfai atdd scaffold --flow BF-NNNN` runs with no pre-existing skeleton for that flow
  Then one file `<testsDir>/e2e/<BF-ID>.test.<ext>` is written carrying `QFAI:BF-NNNN`; `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning), keyed by the BF ID, while its placeholder is still present; and a second run writes nothing.
```
