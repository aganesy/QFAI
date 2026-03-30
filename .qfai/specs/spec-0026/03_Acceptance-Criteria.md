# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0026-0001
Scenario: UI-bearing project generates uiux/ sidecar with all 11 files
  Given a UI-bearing project is detected by surface classification
  When qfai-discussion completes
  Then a uiux/ sidecar directory is created
  And it contains all 11 files (00_index through 60_critique_loop)
  And each file conforms to its defined YAML/MD schema
```

```gherkin
# AC-0026-0002
Scenario: Each sidecar file conforms to schema
  Given uiux/ sidecar generation is triggered
  When each file is written
  Then 00_index.md contains a file manifest with all 11 entries
  And 10_strategy.md contains YAML implementation strategy
  And 20-23 eval axis files contain the 3-layer evaluation model and aggregate scoring rules
  And 30_comparison.md contains option comparison table
  And 31_anchor.md contains anchor screen selection
  And 40_contracts.md contains screen contract drafts
  And 50_review_bundle.md contains review input packaging
  And 60_critique_loop.md contains critique cycle tracking
```

```gherkin
# AC-0026-0003
Scenario: Non-UI projects skip sidecar generation
  Given a non-UI project (surface classification: non-ui)
  When qfai-discussion completes
  Then no uiux/ directory is created
  And no error is emitted
  And the standard 15-file core pack is produced normally
```

```gherkin
# AC-0026-0004
Scenario: SKILL.md includes UI-bearing detection criteria
  Given the updated SKILL.md template
  When an assistant reads SKILL.md
  Then UI-bearing detection heuristics and signals are documented
  And surface classification categories (web-ui, mobile-ui, desktop-ui, mixed, non-ui) are listed
```

```gherkin
# AC-0026-0005
Scenario: SKILL.md defines UI-bearing completion conditions
  Given a UI-bearing project
  When the SKILL.md flow executes
  Then completion requires strategy selected, scoring axes defined, anchor screen chosen, and contracts drafted
  And all 4 conditions must be met before marking done
```

```gherkin
# AC-0026-0006
Scenario: Non-UI completion conditions unchanged
  Given a non-UI project
  When the SKILL.md flow executes
  Then completion conditions match pre-v1.7.3 behavior
  And no UI/UX-specific conditions are required
```

```gherkin
# AC-0026-0007
Scenario: 03_Story-Workshop focuses on behavior obligations
  Given the updated 03_Story-Workshop template
  When applied to a UI-bearing project
  Then the primary focus is on behavior obligations (state coverage, interaction contracts, error handling)
  And HTML/CSS mock is available only as a fallback option
```

```gherkin
# AC-0026-0008
Scenario: 04_Sources includes translation-aware registry
  Given the updated 04_Sources template
  When competitive references are available
  Then each reference includes adopted_points, rejected_points, and local_translation fields
  And empty registry produces valid table with no entries
```

```gherkin
# AC-0026-0009
Scenario: 14_Review-Request includes sidecar review scope
  Given the updated 14_Review-Request template
  When generated for a UI-bearing project
  Then review scope includes uiux/ sidecar artifact completeness check
  And reviewer is prompted to verify sidecar file count and schema conformance
```

```gherkin
# AC-0026-0010
Scenario: Core templates include UX intent cross-references
  Given a UI-bearing project with uiux/ sidecar
  When core templates (01, 02, 05-12, 99) are generated
  Then UX intent placeholders reference design goals from uiux/ sidecar
  And no concrete UI (layouts, colors, component names) is hardcoded
```

```gherkin
# AC-0026-0011
Scenario: Cross-references gracefully degrade without sidecar
  Given a non-UI project (no uiux/ sidecar exists)
  When core templates are generated
  Then UX intent placeholders render as empty or hidden
  And no broken links or reference errors occur
```

```gherkin
# AC-0026-0012
Scenario: Init assets include all new and changed files
  Given all v1.7.3 template changes are complete
  When qfai init runs on a fresh project
  Then the updated SKILL.md is distributed
  And the 11 sidecar template files are present in init assets
  And the 3 replaced direct templates are updated
  And the augmented batch templates include UX intent sections
  And verify-pack passes without error
```

```gherkin
# AC-0026-0013
Scenario: Surface classification determines UI-bearing status
  Given a project context with surface metadata
  When SKILL.md detection heuristics evaluate the context
  Then the project is classified as one of: web-ui, mobile-ui, desktop-ui, mixed, non-ui
  And classification uses surface type only, not interaction complexity
```

```gherkin
# AC-0026-0014
Scenario: Implementation strategy artifact uses YAML format
  Given a UI-bearing project
  When uiux/10_strategy.md is generated
  Then it contains a YAML-formatted implementation strategy
  And it references the surface classification result
  And it includes version field for forward compatibility
```

```gherkin
# AC-0026-0015
Scenario: 3-layer scoring axes are defined
  Given a UI-bearing project
  When uiux/20-23 eval axis files are generated
  Then the files define invariant, trend-derived, and product-specific evaluation layers
  And aggregate scoring rules define weights, normalization, thresholds, and stopping guidance
```

```gherkin
# AC-0026-0016
Scenario: Strategy artifact contains all 5 required fields
  Given a discussion pack is generated for a UI-bearing project
  When uiux/10_strategy.md is written
  Then the artifact contains selection_required field
  And it contains candidate_options field
  And it contains chosen_option field
  And it contains verification_expectations field
  And it contains none-as-legitimate-outcome field
```

```gherkin
# AC-0026-0017
Scenario: Validation emits actionable error when selection_required is true and chosen_option is empty
  Given uiux/10_strategy.md has selection_required set to true
  And chosen_option is empty
  When qfai validate runs
  Then an actionable error is emitted
  And the error message identifies the missing chosen_option field
```

```gherkin
# AC-0026-0018
Scenario: none-as-legitimate-outcome is accepted as chosen_option when rationale is recorded
  Given uiux/10_strategy.md has chosen_option set to none-as-legitimate-outcome
  And a rationale is recorded in the artifact
  When qfai validate runs
  Then the artifact is accepted as valid
  And no error is emitted for the none-as-legitimate-outcome choice
```

```gherkin
# AC-0026-0019
Scenario: Reviewer can audit all 5 fields without source access
  Given a finalized uiux/10_strategy.md artifact
  When a reviewer reads the artifact
  Then all 5 fields are present and human-readable
  And no source code access is required to audit the artifact
```

```gherkin
# AC-0026-0020
Scenario: Strategy artifact fields are immutable after finalization
  Given uiux/10_strategy.md transitions from draft to finalized state
  When the artifact is in finalized state
  Then all 5 fields are immutable
  And no field modification is accepted without a new draft cycle
```

```gherkin
# AC-0026-0021
Scenario: Regenerating strategy artifact for same input yields identical field values
  Given uiux/10_strategy.md has been generated for a given input
  When the artifact is regenerated using the same input
  Then all 5 field values are identical to the first generation
```

## AC Catalog (optional)

| AC-ID        | Title                          | Notes                        | Priority |
| ------------ | ------------------------------ | ---------------------------- | -------- |
| AC-0026-0001 | Sidecar 11-file generation     | Complete file set            | P1       |
| AC-0026-0002 | Sidecar schema conformance     | Each file validates          | P1       |
| AC-0026-0003 | Non-UI skip                    | Zero sidecar, zero errors    | P1       |
| AC-0026-0004 | SKILL.md detection criteria    | Heuristics documented        | P1       |
| AC-0026-0005 | SKILL.md completion conditions | 4 UI conditions              | P1       |
| AC-0026-0006 | Non-UI completion unchanged    | Backward compatible          | P1       |
| AC-0026-0007 | 03 behavior obligations        | HTML mock demoted            | P1       |
| AC-0026-0008 | 04 translation-aware registry  | 3-field classification       | P1       |
| AC-0026-0009 | 14 sidecar review scope        | Reviewer prompted            | P1       |
| AC-0026-0010 | Core UX intent cross-refs      | No concrete UI hardcoded     | P1       |
| AC-0026-0011 | Cross-ref graceful degradation | No broken links              | P2       |
| AC-0026-0012 | Init asset integrity           | verify-pack passes           | P1       |
| AC-0026-0013 | Surface classification         | Surface type only (DR-0057)  | P1       |
| AC-0026-0014 | Strategy YAML artifact         | Version field included       | P1       |
| AC-0026-0015 | 3-layer scoring axes           | 3 layers + aggregate scoring | P1       |
| AC-0026-0016 | Strategy 5-field completeness  | All 5 fields required        | P1       |
| AC-0026-0017 | selection_required+empty error | Actionable validation error  | P1       |
| AC-0026-0018 | none-as-legitimate-outcome     | Rationale required, valid    | P1       |
| AC-0026-0019 | Reviewer audit without source  | All 5 fields readable        | P2       |
| AC-0026-0020 | Fields immutable post-final    | Draft→finalized gate         | P1       |
| AC-0026-0021 | Idempotent field generation    | Same input = same output     | P1       |
