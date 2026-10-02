# Acceptance Criteria

## Criteria

```gherkin
Feature: Rewrite the test annotations to the new IDs
  # AC-0004-0010-01
  Scenario: Test-case annotations outside E2E become example annotations, and story annotations in E2E files become flow annotations
    Given test files outside the E2E layer with QFAI:SPEC-NNNN:TC-… annotations, and a QFAI:SPEC-NNNN:US-… annotation in a file under the E2E layer
    When step 8 runs
    Then each test-case annotation names the EX the ID map gives it
    And the story annotation names the BF of the flow its story joined

  # AC-0004-0010-02
  Scenario: Annotations with no new counterpart stay and are listed
    Given a story annotation outside the E2E layer, an old deferral marker, a test-case annotation the ID map does not hold, and an annotation naming neither a test case nor a story
    When step 8 runs
    Then none of them changes
    And the first two are listed under Annotations kept with the file and line
    And the last two are listed under For a person

  # AC-0004-0010-03
  Scenario: Contract annotations take the new contract IDs
    Given a QFAI:CON-* annotation whose contract is in the contract map, and one naming an old ID no contract declared
    When step 8 runs
    Then the first names the contract's new ID
    And the second is unchanged and listed under For a person

  # AC-0004-0010-04
  Scenario: A test-case annotation in an E2E file stays and is listed with the way to settle it
    Given a QFAI:SPEC-NNNN:TC-… annotation the ID map holds, in a file under the E2E layer
    When step 8 runs
    Then the annotation is unchanged
    And it is listed under For a person with its file, line, the EX the map gives it, and a test outside the E2E layer or a Test exception row as the way to settle it
    And validation reports no QFAI-STORY-007 for that file
```
