# Acceptance Criteria

## Criteria

```gherkin
Feature: TDD Micro-Cycle Execution
  # AC-0001-0091-01
  Scenario: TDD Cycle Completeness
    Given an EX that no test annotates on the story tree
    When `/qfai-implement` takes that EX
    Then it runs Red, Green and Refactor observing the result of each phase
    And the test it writes carries `QFAI:EX-NNNN-NNNN-NN`
    And no ledger status is written
    And each focused phase reports exact command arguments, cwd, file selection, case selector, runtime version, reporter, input revision and raw output reference
    And it links the target EX to its source declaration and full file/parent/case identity, with observed execution and terminal result apart from exit, counts, file/container results and static scanner linkage
    And zero selected executions, missing identifiable observations, skip, TODO, cancellation or interruption do not close the phase; the output is retained and selection or observation is corrected before repeating it
    And ordinary RED reaches the selected intended assertion or expected exception and fails on its stated behavior; parent, unrelated, import or unconditional-throw failures do not establish that RED, and existing approved alternative RED routes remain available
    And GREEN and Refactor observe the same selected behavior succeeding on the intended input; an expected-failure inversion is reported separately and is not ordinary behavior success
    And the normal verify run records the full intended collection and actual execution, reconciles comparable case membership and intentional input differences, leaves unknown expected counts unknown and refuses unexplained omissions as full-scope proof
    And Standard Test quoting is preserved, no extra full run is required per focused cycle, and no evidence ledger, JSON field, gate status, runtime parser or runner is introduced
    And where the Test entry of the Standard commands is `CI only: <check name>`, Red and Green are recorded `ci-deferred` without a local run, and the route's code review confirms by reading that the test fails against the code before the fix
    And the user's instruction for this run that delegates the Test gate to a named CI check defers Red and Green the same way for that run only, with the instruction quoted word for word in the stage report; without a quotable instruction they run locally

  # AC-0001-0091-02
  Scenario: Minimal Code In Phase Green
    Given a failing test
    When Phase Green writes production code for it
    Then the code written is the least that makes that test pass, and behaviour no test yet demands is not generalized ahead of its own RED.

  # AC-0001-0091-03
  Scenario: Gate Commands From the Contract Directory
    Given a project on the story tree
    When `/qfai-implement` needs the Test command, or `/qfai-verify` needs the Lint, Typecheck or Build command
    Then it takes the command from the Standard commands section of `<paths.contractsDir>/tech.md` and from no other file, and a capability with no entry there is UNRUN.

  # AC-0001-0091-04
  Scenario: Exempted Examples Are Not Selected
    Given a project on the story tree and an EX that no test annotates, named by a `decisions.md` row whose Content opens `Test exception:`
    When `/qfai-implement` selects its next test
    Then the EX is skipped while that row's Status is DONE, and is selected like any other unannotated EX while the row is TODO or WIP.

  # AC-0001-0091-05
  Scenario: Shipped Minimal-Implementation Rule Drops TC and the Ledger
    Given a project on the story tree
    When § 2 of the shipped rule `minimal-implementation.md` is read
    Then it restates the traceability chain of the constitution's Article V with no TC hop and names no execution ledger, and it defines an observation as an EX row in a story's `03_Example.md` under `<paths.specsDir>`.
```
