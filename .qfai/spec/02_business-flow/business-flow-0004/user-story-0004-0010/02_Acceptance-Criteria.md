# Acceptance Criteria

## Criteria

```gherkin
Feature: Rewrite the test annotations to the new IDs

# AC-0004-0010-01
# Parent: US-0004-0010
Scenario: Test-case annotations become example annotations, and story annotations in E2E files become flow annotations
  Given test files with QFAI:SPEC-NNNN:TC-… annotations, and a QFAI:SPEC-NNNN:US-… annotation in a file under the E2E layer
  When step 8 runs
  Then each test-case annotation names the EX the ID map gives it
  And the story annotation names the BF of the flow its story joined

# AC-0004-0010-02
# Parent: US-0004-0010
Scenario: Annotations with no new counterpart stay and are listed
  Given a story annotation outside the E2E layer, a QFAI:CON-* annotation, an old deferral marker, and a test-case annotation the ID map does not hold
  When step 8 runs
  Then none of them changes
  And the first three are listed under Annotations kept with the file and line
  And the unresolved one is listed under For a person
```
