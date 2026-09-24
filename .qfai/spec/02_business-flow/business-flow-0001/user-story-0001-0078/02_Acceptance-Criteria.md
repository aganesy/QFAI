# Acceptance Criteria

## Criteria

```gherkin
Feature: Config Glob Tuning

# AC-0001-0078-01
# Parent: US-0001-0078
Scenario: Glob Pattern Coverage
  Given the analysis results
  When glob patterns are proposed
  Then 3-10 include patterns cover all discovered test locations and no overly broad patterns (e.g., `**/*`) are used.
  And exclude patterns are added only when the default exclusions do not cover the observed path.

# AC-0001-0078-02
# Parent: US-0001-0078
Scenario: Config Minimal Diff
  Given a project on the story tree with `qfai.config.yaml`
  When /qfai-configure updates its configuration
  Then it changes `validation.traceability.testFileGlobs` and, if needed, `testFileExcludeGlobs`
  And it adds `paths.specsDir` only when that key is absent
  And it adds routing or review-profile overrides only when the user requested them
  And it writes nothing under `.qfai/assistant/`

# AC-0001-0078-03
# Parent: US-0001-0078
Scenario: Story-Tree Specs Directory
  Given a project on the story tree whose `qfai.config.yaml` has no `paths.specsDir`
  When `/qfai-configure` updates the config
  Then it writes `paths.specsDir: .qfai/spec`

Scenario: Existing specs directory remains configured
  Given the same project has `paths.specsDir` already set
  When `/qfai-configure` updates the config
  Then the existing value is left unchanged
```
