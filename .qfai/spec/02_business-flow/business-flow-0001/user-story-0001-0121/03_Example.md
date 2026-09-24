# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                   | Expected                                                                                                               |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0121-01 | AC-0001-0121-01 | Given every image slot is filled from Unsplash or Pexels and `prototype-handoff.yaml#imageSources[]` records `{url, license, attribution, source}` for each. When `licenseVerify` runs at end-of-cycle. | Then it returns success; no hard-stop is triggered; the cycle proceeds normally.                                       |
| EX-0001-0121-02 | AC-0001-0121-01 | Given one image slot is filled from a non-allowlisted source (`pinterest.com`) or has `license: "unknown"`. When `licenseVerify` runs.                                                                  | Then the run hard-stops with exit code 66, stderr names the offending image URL, and no further cycles are dispatched. |
