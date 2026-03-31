# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0037-0001: Reviewer template includes taste reflection quality item
Scenario: Taste reflection quality review item present
  Given the uix-rev review template assets
  When a reviewer loads the discussion review template
  Then a review item for "taste reflection quality" is available
  And the item includes evaluation criteria and scoring guidance

# AC-0037-0002: Reviewer template includes anti-preference enforcement item
Scenario: Anti-preference enforcement review item present
  Given the uix-rev review template assets
  When a reviewer loads the discussion review template
  Then a review item for "anti-preference enforcement" is available
  And the item evaluates whether anti-preferences are excluded from design direction

# AC-0037-0003: Reviewer template includes trend relevance/freshness item
Scenario: Trend relevance/freshness review item present
  Given the uix-rev review template assets
  When a reviewer loads the discussion review template
  Then a review item for "trend relevance/freshness" is available
  And the item evaluates temporal relevance of referenced trends

# AC-0037-0004: Reviewer template includes dynamic axis specificity item
Scenario: Dynamic axis specificity review item present
  Given the uix-rev review template assets
  When a reviewer loads the discussion review template
  Then a review item for "dynamic axis specificity" is available
  And the item checks that axes are project-specific rather than generic

# AC-0037-0005: Reviewer template includes generic fallback persistence item
Scenario: Generic fallback persistence review item present
  Given the uix-rev review template assets
  When a reviewer loads the discussion review template
  Then a review item for "generic fallback persistence" is available
  And the item flags any generic/placeholder axes that should have been specialized

# AC-0037-0006: 3 migration versions defined and documented
Scenario: Migration versions are defined
  Given the migration validator configuration
  When migration validators are loaded
  Then 3 migration versions are recognized: old no-sidecar, v1.7.6-v1.7.7 intermediate, v1.7.8 final
  And each version has a defined detection signature

# AC-0037-0007: Migration validator detects stale versions and provides upgrade guidance
Scenario: Stale version detected with upgrade guidance
  Given a discussion pack in old no-sidecar format
  When the migration validator runs
  Then the validator detects the stale version
  And provides upgrade guidance for transitioning to v1.7.8 final format

# AC-0037-0008: Old pack produces warning not error in v1.7.8
Scenario: Old pack triggers warning not error
  Given a discussion pack in old no-sidecar format
  When validation runs in v1.7.8
  Then the finding severity is "warning" not "error"
  And the warning includes the migration path to follow

# AC-0037-0009: 4 maturity terms only across all docs
Scenario: Only allowed maturity terms in documentation
  Given README.md, CHANGELOG.md, steering docs, and source comments
  When a vocabulary scan runs
  Then only the 4 allowed maturity terms are found: complete, foundation-only, preview, correction target
  And no prohibited synonyms (done, finished, deferred, planned, etc.) are present for feature maturity

# AC-0037-0010: No contradictions across docs for same subsystem
Scenario: No contradictory maturity states
  Given documentation across README, CHANGELOG, steering, and source
  When a contradiction detection scan runs
  Then no subsystem is described with contradictory maturity states
  And any detected contradiction is reported with file locations

# AC-0037-0011: Master convergence document exists
Scenario: Convergence document created
  Given the steering docs directory
  When the convergence document is checked
  Then a master convergence document exists as a new steering doc
  And it is referenced from product/manifest/spec index

# AC-0037-0012: Every new validator has surface type guard
Scenario: Surface type guard present on new validators
  Given all new validators introduced in v1.7.8
  When each validator is inspected
  Then every validator contains a surface type guard check
  And the guard returns n/a for non-UI projects

# AC-0037-0013: Non-UI fire count is zero
Scenario: Zero over-fires on non-UI project
  Given a non-UI project fixture (CLI-only, no UI components)
  When all new validators run against the fixture
  Then the total UI-bearing validator fire count is 0

# AC-0037-0014: 3 fixture tests per new validator
Scenario: Minimum fixture tests per validator
  Given each new validator introduced in v1.7.8
  When test coverage is checked
  Then each validator has at least 3 fixture tests: pass, fail, and non-UI
```

---

### US-0037-0005: Docs/steering/tests normalized to v1.7.11 truth [v1.7.11 WS-J]

```gherkin
# AC-0037-0015: Maturity claims consistent across all documents
Scenario: Maturity claims use permitted vocabulary consistently
  Given steering docs, CHANGELOG, and release notes for v1.7.11
  When a vocabulary and consistency scan runs
  Then all maturity claims use only permitted terms (implemented, partial, deferred)
  And no subsystem has contradictory maturity states across documents

# AC-0037-0016: Test fixtures use canonical 3-layer expectations
Scenario: Test fixtures reflect canonical 3-layer model
  Given the test fixture directory for discussion validation
  When fixture expectations are inspected
  Then all UI-bearing test fixtures use canonical 3-layer model expectations
  And no fixture references legacy 4-axis model expectations

# AC-0037-0017: Integration tests exist for canonical path
Scenario: validateProject() integration tests for canonical path
  Given the integration test suite
  When validateProject() integration tests are inspected
  Then at least one integration test validates a canonical 3-layer discussion pack end-to-end
  And the test exercises the full validateProject() pipeline including UI-bearing detection and DDS validation
```

## AC Catalog (optional)

| AC-ID        | Title                                  | Notes                         | Priority |
| ------------ | -------------------------------------- | ----------------------------- | -------- |
| AC-0037-0001 | Taste reflection quality item          | Reviewer template extension   | P1       |
| AC-0037-0002 | Anti-preference enforcement item       | Reviewer template extension   | P1       |
| AC-0037-0003 | Trend relevance/freshness item         | Reviewer template extension   | P1       |
| AC-0037-0004 | Dynamic axis specificity item          | Reviewer template extension   | P1       |
| AC-0037-0005 | Generic fallback persistence item      | Reviewer template extension   | P1       |
| AC-0037-0006 | 3 migration versions defined           | Migration normalization       | P1       |
| AC-0037-0007 | Stale version detection + guidance     | Migration normalization       | P1       |
| AC-0037-0008 | Old pack warning not error             | Migration normalization       | P1       |
| AC-0037-0009 | 4 maturity terms only                  | Docs normalization            | P2       |
| AC-0037-0010 | No maturity contradictions             | Docs normalization            | P2       |
| AC-0037-0011 | Convergence doc exists                 | Docs normalization            | P2       |
| AC-0037-0012 | Surface type guard on all validators   | Non-UI safety (cross-cutting) | P0       |
| AC-0037-0013 | Non-UI fire count = 0                  | Non-UI safety (cross-cutting) | P0       |
| AC-0037-0014 | 3 fixture tests per validator          | Non-UI safety (cross-cutting) | P0       |
| AC-0037-0015 | Maturity claims consistent across docs | v1.7.11 WS-J, REQ-0021        | P1       |
| AC-0037-0016 | Test fixtures use canonical 3-layer    | v1.7.11 WS-J, REQ-0022        | P1       |
| AC-0037-0017 | Integration tests for canonical path   | v1.7.11 WS-J, REQ-0023        | P1       |
