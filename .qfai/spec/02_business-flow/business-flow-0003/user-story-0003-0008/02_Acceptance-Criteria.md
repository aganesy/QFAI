# Acceptance Criteria

## Criteria

```gherkin
Feature: stale review-pack TTL archival
  # AC-0003-0008-01
  Scenario: `--clean` archives a review pack past the TTL
    Given the mtime of `.qfai/review/<old-ts>/` is older than the TTL (14 days by default, DR-0264)
    And `review.staleTtlDays` is unset, so the default of 14 applies
    When `qfai doctor --clean` runs
    Then that pack is moved to `.qfai/review/_archive/<old-ts>/`
    And a pack within the TTL stays in `.qfai/review/<ts>/`

  # AC-0003-0008-02
  Scenario: `--clean` never deletes, and the review profile skips `_archive/`
    Given stale packs have been archived
    When `qfai doctor --clean` runs again, followed by `qfai validate --profile review`
    Then archival never deletes a pack; it only moves one
    And `qfai validate --profile review` scans only the top-level `.qfai/review/<ts>/` packs, and `_archive/` is out of scope
    And the `QFAI-REVIEW-003/004/005` behaviour for in-scope packs is unchanged

  # AC-0003-0008-03
  Scenario: A tracked pack is not archived into an ignored directory
    Given a git repository whose `.gitignore` ignores `.qfai/review/_archive/`, and a committed review pack older than the TTL
    When `qfai doctor --clean` runs
    Then the pack stays in `.qfai/review/` and is not moved to `_archive/`

  # AC-0003-0008-04
  Scenario: `--clean` prunes expired validate run logs
    Given validate run logs under the configured output directory, some older than `report.staleTtlDays`
    When `qfai doctor --clean` runs
    Then each expired run outside the newest `report.keepLatestRuns` is removed and the newest runs stay
    And no run is removed when the config has issues or another project root shares the output directory
```
