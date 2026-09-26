# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0143-01
# Parent: US-0001-0143
Scenario: md5 duplicate-capture + missing-route advisory-failing detection (OQ-0109)
  Given a post-capture iter with ≥ 2 distinct declared `screens[].id` entries whose PNG md5 hashes match,
  When `iterate` runs duplicate detection,
  Then `lap-009: duplicate-capture` MUST be surfaced in `layoutAntiPatternsDetected[]` with severity `error` and mandatory Reviewer `justification:` for any override.
  And for every `screens[].id`, iterate MUST verify the generated HTML SPA contains a reachable hashchange or path-based route (`targetUrl#/<route>` or `targetUrl/<route>`); missing routes surface `lap-010: missing-route` with the same advisory-failing posture.
  And the md5 detection MUST be deterministic across re-runs on the same screen set.
```
