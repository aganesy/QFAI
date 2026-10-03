# Acceptance Criteria

## Criteria

```gherkin
Feature: Discussion-pack location gate
  # AC-0002-0011-01
  Scenario: A discussion pack outside the allowed roots fails the lane
    Given a PR that introduces a `discussion-*/` directory outside the allowed roots (`tmp/`, `.qfai/discussion/<ts>/`)
    When the `check-pack-locations.mjs` lane (wired into `pnpm ci:lint`, scanning staged or changed directories) runs
    Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes the allowed-root path for the misplaced directory

  # AC-0002-0011-02
  Scenario: Discussion packs under the allowed roots pass silently
    Given a PR that adds `discussion-*/` directories only under the allowed roots, or touches no pack directory at all
    When the `check-pack-locations.mjs` lane runs
    Then the lane passes silently with no `R-PACK-LOCATION-DRIFT` finding; pre-existing legacy packs on unrelated PRs are not re-flagged, because only staged or changed directories are read
```
