# 03 Acceptance Criteria

## AC-0009-0001: Repository Analysis Completeness

```gherkin
Scenario: Repository Analysis Completeness
  Given a repository with test files
  When `/qfai-configure` analyzes the project
  Then it identifies test frameworks, test directories, naming conventions, and package manager.
```

## AC-0009-0002: Glob Pattern Coverage

```gherkin
Scenario: Glob Pattern Coverage
  Given the analysis results
  When glob patterns are proposed
  Then 3-10 include patterns cover all discovered test locations and no overly broad patterns (e.g., `**/*`) are used.
```

## AC-0009-0003: Config Minimal Diff

```gherkin
Scenario: Config Minimal Diff
  Given a project on the story tree with `qfai.config.yaml`
  When /qfai-configure updates its configuration
  Then it changes `validation.traceability.testFileGlobs` and, if needed, `testFileExcludeGlobs`
  And it adds `paths.specsDir` only when that key is absent
  And it adds routing or review-profile overrides only when the user requested them
  And it writes nothing under `.qfai/assistant/`
```

## AC-0009-0004: Steering Files Evidence-Based

```gherkin
Scenario: Steering Files Evidence-Based
  Given the story-tree templates for objective, initiative, principle, tech and structure
  When /qfai-configure populates them
  Then each fact is derived from repository evidence or marked `TBD` if unverifiable
  And each fact appears in only one of those five files
```

## AC-0009-0005: Evidence Sampling Produces Matches

```gherkin
Scenario: Evidence Sampling Produces Matches
  Given proposed glob patterns
  When evidence sampling runs
  Then 5-15 actual test files are listed. Zero matches triggers a stop-and-ask.
```

## AC-0009-0006: Tool Selection Rationale Recorded

```gherkin
Scenario: Tool Selection Rationale Recorded
  Given the configure workflow
  When tool selection is made per layer
  Then rationale is recorded in the evidence file.
```

## AC-0009-0007: Minimum Runnable Path Documented

```gherkin
Scenario: Minimum Runnable Path Documented
  Given the project
  When configuration completes
  Then a minimum runnable path (dev server, DB, env, commands) is documented.
```

## AC-0009-0008: Story-Tree Specs Directory

```gherkin
Scenario: Story-Tree Specs Directory
  Given a project on the story tree whose `qfai.config.yaml` has no `paths.specsDir`
  When `/qfai-configure` updates the config
  Then it writes `paths.specsDir: .qfai/spec`

Scenario: Existing specs directory remains configured
  Given the same project has `paths.specsDir` already set
  When `/qfai-configure` updates the config
  Then the existing value is left unchanged
```
