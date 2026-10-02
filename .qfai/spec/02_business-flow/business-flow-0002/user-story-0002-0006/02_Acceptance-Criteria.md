# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped Node and package manager portability
  # AC-0002-0006-01
  Scenario: Shipped install branches are kept
    Given the lockfile-detecting `cache:` expression and the lockfile-aware install branches of the existing shipped workflows (pnpm, yarn Classic, yarn Berry, npm and no lockfile)
    When the hardened shipped set is inspected
    Then every case of the four package managers and no lockfile is still handled by a branch
    And the `cache:` expression has not been replaced by a single-package-manager form
    And new shipped files carry the same install branches

  # AC-0002-0006-02
  Scenario: Portability degrades in opposite directions
    Given an adopter fixture with no Node version file, and an adopter fixture with no `packageManager` field
    When the shipped setup-install sequence runs on each fixture
    Then a missing Node version file fails **open**: the documented literal is used, a warning annotation is emitted and the lane continues
    And an unresolvable package manager fails **closed**: the lane stops with an actionable annotation naming the `packageManager` manifest field as the thing to fix, not an opaque resolution error
```
