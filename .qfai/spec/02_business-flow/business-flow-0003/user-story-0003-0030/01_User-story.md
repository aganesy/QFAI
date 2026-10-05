# US-0003-0030: Mutation proofs that still replay

## User Story

As a maintainer, I want each example test to carry the mutation that proved it, and `qfai doctor` to tell me when that mutation names code that no longer exists, so that a proof taken once can be replayed after the code moves.

## Non-goals

- Running the mutation or the test.
- Requiring a proof on every example test.
