# Acceptance Criteria

## Criteria

```gherkin
Feature: Duplicate capture and missing-route findings
  # AC-0001-0139-01
  Scenario: md5 duplicate-capture + missing-route advisory-failing detection
    Given a post-capture iter with ≥ 2 distinct declared `screens[].id` entries whose PNG md5 hashes match,
    When `iterate` runs duplicate detection,
    Then `lap-009: duplicate-capture` MUST be surfaced in `layoutAntiPatternsDetected[]` with severity `error` and mandatory Reviewer `justification:` for any override.
    And for every `screens[].id`, iterate MUST verify the generated HTML SPA contains a reachable hashchange or path-based route (`targetUrl#/<route>` or `targetUrl/<route>`); missing routes surface `lap-010: missing-route` with the same advisory-failing posture.
    And the md5 detection MUST be deterministic across re-runs on the same screen set.
```
