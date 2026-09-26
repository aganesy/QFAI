# Acceptance Criteria

## Criteria

```gherkin
Feature: TDD Micro-Cycle Execution

# AC-0001-0094-01
# Parent: US-0001-0094
Scenario: TDD Cycle Completeness
  Given an EX that no test annotates on the story tree
  When `/qfai-implement` takes that EX
  Then it runs Red, Green and Refactor with evidence at each phase
  And the test it writes carries `QFAI:EX-NNNN-NNNN-NN`
  And no ledger status is written

# AC-0001-0094-02
# Parent: US-0001-0094
Scenario: Minimal Code In Phase Green
  Given a failing test
  When Phase Green writes production code for it
  Then the code written is the least that makes that test pass, and behaviour no test yet demands is not generalized ahead of its own RED.

# AC-0001-0094-03
# Parent: US-0001-0094
Scenario: Gate Commands From the Contract Directory
  Given a project on the story tree
  When `/qfai-implement` needs a Test, Lint, Typecheck or Build command
  Then it takes the command from the Standard commands section of `<paths.contractsDir>/tech.md` and from no other file.

# AC-0001-0094-04
# Parent: US-0001-0094
Scenario: Exempted Examples Are Not Selected
  Given a project on the story tree and an EX that no test annotates, named by a `decisions.md` row whose Content opens `Test exception:`
  When `/qfai-implement` selects its next test
  Then the EX is skipped while that row's Status is DONE, and is selected like any other unannotated EX while the row is TODO or WIP.

# AC-0001-0094-05
# Parent: US-0001-0094
Scenario: Shipped Minimal-Implementation Rule Drops TC and the Ledger
  Given a project on the story tree
  When § 2 of the shipped rule `minimal-implementation.md` is read
  Then it restates the traceability chain of the constitution's Article V with no TC hop and names no execution ledger, and it defines an observation as an EX row in a story's `03_Example.md` under `<paths.specsDir>`.
```
