# US-0001-0091: TDD Micro-Cycle Execution

## User Story

As a developer, I want `/qfai-implement` to run the TDD cycle (Red, Green, Refactor) one test at a time, taking next the example (EX) with the lowest ID that no test annotates and writing its test carrying `QFAI:EX-NNNN-NNNN-NN`, so that production code is test-driven and the next test is read from the tests themselves rather than from a ledger.
