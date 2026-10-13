# Acceptance Criteria

## Criteria

```gherkin
Feature: Reuse completed analysis safely across worktrees

  # AC-0001-0236-01
  Scenario: Restore only proven completed snapshots
    Given a completed local snapshot for the same repository and a proven compatible engine combination
    When I prepare a new worktree
    Then an independent working copy is restored and native current-scope checks precede a query

  # AC-0001-0236-02
  Scenario: Keep worktrees independently writable
    Given two worktrees or Windows and WSL environments
    When they use analysis concurrently
    Then no live database, graph, daemon, PID, socket or lock is shared and each worktree serializes its CLI queries and preparation with its own lock

  # AC-0001-0236-03
  Scenario: Check native freshness after input changes
    Given analysis that may differ from the current worktree
    When I use a graph after changing inputs
    Then native engine operations reconcile the requested scope before it is reported as current

  # AC-0001-0236-04
  Scenario: Reject unusable snapshots
    Given a missing, partial, corrupt, incompatible or unsafe candidate
    When I prepare analysis
    Then the candidate is excluded from queries and required local preparation is reported

  # AC-0001-0236-05
  Scenario: Retain prior usable analysis after failure
    Given a valid prior working copy
    When freshness checking or replacement generation fails
    Then prior state is preserved and stale requested scope is not reported as current, while contention or an abandoned lock reports retry or manual recovery without deleting another operation's lock

  # AC-0001-0236-06
  Scenario: Keep generated state outside Git
    Given tracked source and processing definitions
    When I initialize or update generated tool state
    Then analysis and runtimes require no Git tracking or compulsory generated-data PR checks
```
