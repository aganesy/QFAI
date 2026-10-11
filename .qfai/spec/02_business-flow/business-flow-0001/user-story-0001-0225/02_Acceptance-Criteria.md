# Acceptance Criteria

## Criteria

```gherkin
Feature: Review a change twice: the specification before the code, and the code at the end
  # AC-0001-0225-01
  Scenario: A change to the specification gets two reviews
    Given a change route whose plan has a specification stage
    When the route runs
    Then after that stage `requirements-reviewer` reviews the specification change, joined by `architecture-reviewer` when a contract changed
    And after the stage running `verify-change-note`, the last before the gates, `implementation-reviewer` reviews the whole diff
    And a fix the gates stage makes after that review is not reviewed again, and its diff is listed in the final report

  # AC-0001-0225-02
  Scenario: A change route with no specification stage gets one review
    Given a change route whose plan has no specification stage, a fix route included
    When the route runs
    Then `implementation-reviewer` reviews the whole diff once, after the stage running `verify-change-note`, the last before the gates
    And no other review, blocking reviewer or gate observation runs
    And a fix the gates stage makes after that review is not reviewed again, and its diff is listed in the final report

  # AC-0001-0225-03
  Scenario: The gates alone verify, once, and the change is committed locally
    Given the verify stage of a route, or a route that ends at `triage-close`
    When it runs
    Then it holds no review
    And lint, typecheck, build, the full tests and `qfai validate` run there and nowhere earlier in the route
    And when every gate passed, the change is committed locally, and nothing is pushed
    And a CI-only gate explicitly delegated by user instruction or project policy may remain DELEGATED with its named check pending while a local commit transports only the session's tracked deliverables to CI
    And every nondelegated gate must pass, and a delegated red check stops transport of the same unchanged candidate
    And an explicitly delegated transport commit may instead carry actual changes addressing that failure through the existing planned fix procedure into a new CI candidate, preserving the prior failing head, check, run and observed result as FAIL
    And neither the pending-check nor the changed-candidate transport completes verification or authorizes a merge; prior failure is never relabelled pending and the new candidate remains unverified until its own CI results are observed
    And missing or refused execution outside that delegation, or an ordinary FAIL or UNRUN including a base failure, still stops the commit; locally runnable gates are not delegated merely to avoid running them

  # AC-0001-0225-04
  Scenario: A UI-bearing flow adds the surface reviewer
    Given a change route on a flow a UI contract with screens serves
    When either review runs
    Then `product-surface-reviewer` joins it
```
