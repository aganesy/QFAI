# Acceptance Criteria

## Criteria

```gherkin
Feature: Layer-to-CI-lane mapping in a home the layer parser cannot see

# AC-0002-0021-01
# Parent: US-0002-0021
Scenario: The layer-to-CI-lane mapping has a discoverable home the parser cannot see
  Given the layer-policy loader reads only the layer catalog and its legacy fallback
  When the mapping document is added as a sibling catalog file
  Then the file exists in the asset tree and in the mirrored repository-root tree
  And the layer catalog cross-links to it, and it cross-links back
  And its header states that the layer-policy loader does not read it
  And its prose does not read as activating per-level routing, which the layer catalog marks as not enforced
  And with the rule/ skill/ agent/ prompt/ assistant tree the mapping is instead a section of the layer catalog rule/test-layers.md, and no sibling mapping file exists in either tree
  And that section states that it does not activate per-level routing

# AC-0002-0021-02
# Parent: US-0002-0021
Scenario: A normative document must not become vocabulary
  Given the layer-policy parser extracts every layer token and every layer heading from the files it reads
  When the mapping document has landed
  Then the layer-vocabulary warning count is unchanged from the recorded baseline
  And the built-in layer token set is unmodified
  And every layer code the mapping document names also appears in the layer catalog
  And extending the built-in token set to legalize CI vocabulary is rejected

# AC-0002-0021-03
# Parent: US-0002-0021
Scenario: The repository-root path resolves to the packaged asset, so there is no second copy to author
  Given the repository-root assistant catalog entry is a symbolic link to the packaged asset catalog
  When the mapping document is authored under the packaged asset catalog directory
  Then reading the repository-root path returns the same bytes, with no synchronization step
  And the link check reports no drift
  And a repository-root path that is a regular file where the link check expects a link fails that check
  And with the rule/ skill/ agent/ prompt/ assistant tree the packaged file is rule/test-layers.md under the packaged asset tree, and the repository-root rule path resolves to it the same way
```
