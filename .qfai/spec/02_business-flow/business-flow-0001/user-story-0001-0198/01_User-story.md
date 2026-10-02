# US-0001-0198: Fix a defective acceptance test with example coverage untouched

## User Story

As an operator whose bug report traces to a broken acceptance-layer test, I want `/qfai-atdd` to fix that E2E, API or integration test while it keeps checking the same BF or AC, so that the tree still says what the obligation is and nothing claims it changed.

## Non-goals

- Fixing a test that checks an EX, which `/qfai-implement` does.
- Changing what the test expects.
