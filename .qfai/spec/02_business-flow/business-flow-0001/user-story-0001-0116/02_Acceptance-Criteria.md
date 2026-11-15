# Acceptance Criteria

## Criteria

```gherkin
Feature: Qualitative screen impressions
  # AC-0001-0116-03
  Scenario: Menu reachability exercised at least once per Reviewer session
    Given a spec × screen (UI contract × screen on the story tree) with declared primary menu entry points (sidebar / topbar / bottombar as system-appropriate),
    When the Reviewer's Playwright session runs,
    Then the Reviewer SHOULD exercise every primary menu entry point at least once and reflect findings in the `menuReachabilityFeel` prose field; unreachable entries surface as qualitative critique and do NOT hard-fail the cycle.

  # AC-0001-0116-04
  Scenario: The business-screen floor blocks on what the run adds or changes
    Given an application screen the Reviewer reviews in full,
    When a business-screen floor part is missing and its UI contract records no reason,
    Then the Reviewer reports a blocking finding where the run added, changed or removed that part, and critique where the part was already missing before the run.
```
