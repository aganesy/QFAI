# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0002-0011-01
# Parent: US-0002-0011
Scenario: AC-0002-0011-01
  Given a PR that introduces a `review-*/` or `discussion-*/` directory outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`)
  When the `check-pack-locations.mjs` lane (wired into `pnpm ci:lint`, scanning staged / changed dirs per DR-0274) runs
  Then the lane FAILS emitting `R-PACK-LOCATION-DRIFT` that references `.agents/rules/root-additions-policy.md` and proposes the correct allowed-root path for the misplaced directory

# AC-0002-0011-02
# Parent: US-0002-0011
Scenario: AC-0002-0011-02
  Given a PR that adds `review-*/` or `discussion-*/` directories only under allowed roots (or touches no pack directories at all)
  When the `check-pack-locations.mjs` lane runs
  Then the lane passes silently with no `R-PACK-LOCATION-DRIFT` finding; pre-existing legacy packs on unrelated PRs are not re-flagged (staged/changed-dir scope, not a full-tree walk, per DR-0274)
```
