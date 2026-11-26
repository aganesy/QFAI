# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped action pin policy and trailer resolution
  # AC-0002-0002-01
  Scenario: Shipped actions are SHA-pinned with a readable step name
    Given every `uses:` reference in the shipped workflow set
    When each reference and the `name:` of the step holding it are inspected
    Then every reference is pinned in 40-hex commit SHA form
    And the readable version is written in the step `name:` without a leading `v`, and no version appears in a comment trailer
    And third-party references are only the closed sanctioned set, the minimum package-manager availability needs (today one: the pnpm setup action), asserted as an allow-list and not as a count of zero

  # AC-0002-0002-02
  Scenario: The leakage guard keeps its breadth
    Given the SHA-pinned shipped workflow set and the post-build `check-no-internal-version-leakage` guard that scans files listed by `npm pack --dry-run` for leaked internal versions and identifiers
    When the guard scans the package file set, and scans it again after a conventional `# v<X.Y.Z>` pin trailer is planted in a file in that set
    Then the first run exits 0 and the second exits 1. The resolution comes from the shipped spelling: the guard has lost no pattern and narrowed none, and has gained no pragma handling, no allowed path and no allow-list entry. A pattern is only ever added, and only in the lockstep NFR-C0005 sets: the three guard implementations and `.agents/rules/distributed-surface.local.md` in one change that edits no template
```
