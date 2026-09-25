# Acceptance Criteria

## Criteria

```gherkin
Feature: Move policy and catalog content into the merged files once

# AC-0004-0006-01
# Parent: US-0004-0006
Scenario: Every section lands in one destination, and no fact is stated twice
  Given a project on the spec-pack layout with the policy files and the adopter-owned catalog files
  When step 3 runs
  Then every section except those in the retired slice policy is in the destination the source map gives it
  And the complete original `_policies/11_Slice-Policy.md` is archived without copying a section into `principle.md`
  And the current operation and ID rules remain in the shipped `qfai-sdd/references/sdd-triage.md`
  And no paragraph appears twice in a destination
  And the consumed source files are gone

# AC-0004-0006-02
# Parent: US-0004-0006
Scenario: A manifest entry that equals the built-in default is not carried
  Given a project whose agent manifests hold one entry changed from the package default and one equal to it
  When step 3 runs
  Then qfai.config.yaml holds an override for the changed entry only
```
