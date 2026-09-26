# Acceptance Criteria

## Criteria

```gherkin
Feature: Keep every test case as an example

# AC-0004-0008-01
# Parent: US-0004-0008
Scenario: Step 5 converts a test-case-only row citing one criterion
  Given a 06_Test-Cases row whose EX-Ref is — and which cites exactly one AC
  When step 5 runs
  Then an EX row for it is under that AC's story, with the new ID the ID map gives it
  And Cases to examples lists its old TC ID and its new EX ID

# AC-0004-0008-02
# Parent: US-0004-0008
Scenario: A case step 5 cannot convert is listed for a person
  Given 06_Test-Cases rows whose EX-Ref is —, one citing no AC, one citing two, and one citing an AC that has no new ID
  When step 5 runs
  Then each is listed under For a person with their file and the reason
  And the rows with EX-Ref — in the input number exactly the entries under Cases to examples plus the TC rows under For a person

# AC-0004-0008-03
# Parent: US-0004-0008
Scenario: Step 6 sets the AC-Ref from the test cases that cite the example
  Given examples cited by test cases naming between them exactly one AC, no AC, and two ACs, and an example no test case cites
  When steps 4 and 6 run
  Then the first example's AC-Ref names that AC's new ID
  And the others stay in their spec pack with no new ID, and step 4 lists them under For a person
```
