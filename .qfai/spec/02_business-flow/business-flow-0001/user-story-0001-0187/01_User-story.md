# US-0001-0187: Repair a defective test with example coverage untouched

## User Story

As an operator, I want a bug report whose cause is a broken test fixed at the test, so that no example of the bound flow changes whether a test annotates it, because the obligation it states has not changed.

## Non-goals

- A test edit that changes what the expectation means.
- A fix accepted with no independent review or re-run.
- The stage skill that makes the fix.
