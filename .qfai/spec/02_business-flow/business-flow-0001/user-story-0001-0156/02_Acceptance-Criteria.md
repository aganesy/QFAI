# Acceptance Criteria

## Criteria

```gherkin
Feature: Optional Side Artifact Neutrality

# AC-0001-0156-01
# Parent: US-0001-0156
Scenario: No usable source stops SDD preflight
  Given there is no discussion pack, import-lite input, or explicit user requirement
  When SDD preflight runs
  Then SDD stops because it has no usable source.

# AC-0001-0156-02
# Parent: US-0001-0156
Scenario: An incomplete but usable pack remains source material
  Given a usable discussion pack has an incomplete markdown file, a blocking OQ, or an optional side artifact such as `prototyping.yaml` that is absent, malformed or in a legacy format
  When SDD preflight runs
  Then those defects alone do not block SDD from reading the pack as source material
  And the optional side artifact's state alone does not change preflight readiness
  And SDD does not edit or rerun the discussion pack to clear its own gate.
```
