# US-0001-0203: Fix a defective example test with example coverage untouched

## User Story

As an operator whose bug report traces to a broken test that checks an example, I want `/qfai-implement` to fix that test while it keeps checking the same example, so that the tree still says what the obligation is.

## Non-goals

- Fixing a test that checks a business flow or a criterion, which `/qfai-atdd` does
- Changing what the test expects
