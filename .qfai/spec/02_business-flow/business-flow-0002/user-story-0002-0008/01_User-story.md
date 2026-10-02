# US-0002-0008: Structural contract gate for the shipped set

## User Story

As a QFAI maintainer, I want a gate, run from the lint aggregate or the test matrix, to assert the shipped set against one declared expected shape held in the test suite and to exit 1 when a load-bearing semantic value such as a profile value or a failure threshold drifts, so that a change to the shipped workflows cannot silently alter what adopters receive.

## Non-goals

- A byte-for-byte comparison with the repository's own copy, which is being removed and so leaves nothing to compare against
- Placing the gate in a release-only gate aggregate
- Numeric drift scoring
