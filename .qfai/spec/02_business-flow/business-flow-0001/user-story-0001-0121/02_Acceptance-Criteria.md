# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0121-01
# Parent: US-0001-0121
Scenario: License-permitted stock-photo fill recorded per image
  Given every image slot referenced by the prototype set,
  When the slot is filled at any cycle,
  Then the image source is drawn from the cycle-0 frozen license catalog (allowlist: Unsplash, Pexels per OQ-0002 / SRC-0005 / SRC-0006), AND a row `{url, license, attribution, source}` is written to `prototype-handoff.yaml#imageSources[]` for every fill, AND license-verify failure (unknown license / non-allowlisted source / non-https url / missing attribution) hard-stops the run with exit 66, AND a malformed `imageSources[]` entry (missing or non-string `url`/`source`/`license`) hard-stops the run with exit 2 (input-shape class) at the iterate boundary before the license-verify gate runs.
```
