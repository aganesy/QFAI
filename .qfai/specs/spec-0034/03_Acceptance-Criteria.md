# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0034-0001: Taste interview artifact exists with 10 sections
Scenario: Design taste interview artifact generated for UI-bearing project
  Given a UI-bearing discussion pack
  When the discussion skill completes the taste interview step
  Then uiux/11_design_taste_interview.md exists in the discussion pack
  And the artifact contains all 10 sections (visual_character, emotional_tone, anti_preferences, admired_rejected_references, novelty_vs_safety, density_hierarchy, motion_material, brand_tone, taste_reflection_depth, unresolved_taste_questions)
  And each section has non-empty content

# AC-0034-0002: Taste completeness validator detects missing artifact
Scenario: Taste validator fires on missing taste interview
  Given a UI-bearing discussion pack without uiux/11_design_taste_interview.md
  When qfai validate runs
  Then UIX-VAL-TASTE-MISSING is reported as error

# AC-0034-0003: Taste completeness validator detects incomplete artifact
Scenario: Taste validator fires on incomplete taste interview
  Given a UI-bearing discussion pack with uiux/11_design_taste_interview.md
  And the artifact is missing 3 of 10 sections
  When qfai validate runs
  Then UIX-VAL-TASTE-INCOMPLETE is reported as error
  And the error message lists the missing section names

# AC-0034-0004: Taste validator skips non-UI project
Scenario: Taste validator does not fire on non-UI project
  Given a non-UI discussion pack (surface_type: non-ui)
  When qfai validate runs
  Then no UIX-VAL-TASTE-* issues are reported

# AC-0034-0005: Trend scan present in 04_Sources with freshness metadata
Scenario: Trend scan recorded with freshness metadata
  Given a UI-bearing discussion pack
  When the discussion skill completes the trend research step
  Then 04_Sources.md contains a trend scan summary section
  And each trend reference has freshness_date, confidence, and source_translation fields

# AC-0034-0006: Trend scan validator detects missing scan
Scenario: Trend validator fires on missing trend scan
  Given a UI-bearing discussion pack without trend scan in 04_Sources.md
  When qfai validate runs
  Then UIX-VAL-TREND-SCAN-MISSING is reported as error

# AC-0034-0007: Trend scan validator detects missing freshness metadata
Scenario: Trend validator fires on missing freshness metadata
  Given a UI-bearing discussion pack with trend scan but without freshness metadata
  When qfai validate runs
  Then UIX-VAL-TREND-FRESHNESS-MISSING is reported as error

# AC-0034-0008: Trend validator skips non-UI project
Scenario: Trend validator does not fire on non-UI project
  Given a non-UI discussion pack (surface_type: non-ui)
  When qfai validate runs
  Then no UIX-VAL-TREND-* issues are reported

# AC-0034-0009: 3-layer model applied in all sidecar artifacts
Scenario: New pack uses 3-layer evaluation model
  Given a newly generated discussion pack with UI-bearing sidecar
  When the sidecar evaluation axes are inspected
  Then all axes are classified as invariant, trend-derived, or product-specific
  And no 4-axis (usability/consistency/accessibility/delight) classification remains

# AC-0034-0010: Legacy 4-axis format produces migration warning
Scenario: Legacy 4-axis pack triggers warning during migration window
  Given a discussion pack with 4-axis evaluation model (v1.7.6/v1.7.7 format)
  When qfai validate runs during the migration window
  Then a warning is reported indicating 4-axis format is deprecated
  And upgrade guidance to 3-layer model is included in the message

# AC-0034-0011: Mixed 4-axis and 3-layer produces error
Scenario: Mixed evaluation model detected as error
  Given a discussion pack with some axes in 4-axis format and some in 3-layer format
  When qfai validate runs
  Then an error is reported indicating inconsistent evaluation model
  And affected axis names are listed

# AC-0034-0012: Validators and reviewers unified under 3-layer
Scenario: Validators and reviewers reference 3-layer model
  Given the QFAI validator and reviewer codebases
  When evaluation axis references are inspected
  Then all validators reference the 3-layer model (invariant/trend-derived/product-specific)
  And all reviewer templates reference the 3-layer model

# AC-0034-0013: Scoring-ready schema applied to all axes
Scenario: All evaluation axes have 16-field scoring-ready schema
  Given a UI-bearing discussion pack with 3-layer evaluation model
  When the scoring-ready axis artifacts are inspected
  Then each axis artifact contains all 16 fields
  And UIX-VAL-DYNAMIC-AXIS-MISSING / INCOMPLETE validator passes

# AC-0034-0014: Scoring-ready schema validator detects missing fields
Scenario: Scoring-ready validator fires on incomplete schema
  Given a UI-bearing discussion pack with an axis missing required fields
  When qfai validate runs
  Then UIX-VAL-DYNAMIC-AXIS-INCOMPLETE is reported as error
  And the error message lists the missing field names

# AC-0034-0015: Aggregate scoring rules defined
Scenario: Aggregate scoring rules present
  Given a UI-bearing discussion pack with scoring-ready axes
  When the aggregate scoring configuration is inspected
  Then thresholds, floors, plateau, and missing_score_policy fields are defined

# AC-0034-0016: Scoring-ready validator skips non-UI project
Scenario: Scoring-ready validator does not fire on non-UI project
  Given a non-UI discussion pack (surface_type: non-ui)
  When qfai validate runs
  Then no UIX-VAL-DYNAMIC-AXIS-* issues are reported

# AC-0034-0017: Strategy artifact has 8 fields
Scenario: Strategy artifact uses strong universal schema
  Given a UI-bearing discussion pack
  When uiux/10_strategy.* is inspected
  Then the artifact contains all 8 fields (surface, selection_required, decision, candidate_options, chosen_option, rationale, verification_expectations, notes_for_reviewer)

# AC-0034-0018: Weak strategy format produces warning
Scenario: Weak strategy format triggers warning during migration window
  Given a discussion pack with strategy in weak format (surface_type/approach/rationale only)
  When qfai validate runs during the migration window
  Then UIX-VAL-STRATEGY-WEAK-LEGACY is reported as warning
  And upgrade guidance to 8-field schema is included

# AC-0034-0019: Strategy validator skips non-UI project
Scenario: Strategy validator does not fire on non-UI project
  Given a non-UI discussion pack (surface_type: non-ui)
  When qfai validate runs
  Then no UIX-VAL-STRATEGY-* issues are reported

# AC-0034-0020: Screen contract has 10 fields
Scenario: Screen contract uses full schema
  Given a UI-bearing discussion pack
  When uiux/40_contracts.* is inspected
  Then each screen entry contains all 10 fields (screen_id, route, purpose, actor, primary_tasks, required_states, transitions, observable_outcomes, notes_for_verify, notes_for_reviewer)

# AC-0034-0021: Screen contract supports multi-screen
Scenario: Multi-screen contract validated
  Given a UI-bearing discussion pack with 3 screen entries
  When qfai validate runs
  Then all 3 screen entries are validated individually
  And no cross-screen field collision errors occur

# AC-0034-0022: Screen contract validator detects incomplete schema
Scenario: Screen contract validator fires on incomplete fields
  Given a UI-bearing discussion pack with a screen entry missing required fields
  When qfai validate runs
  Then UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE is reported as error
  And the error message lists the missing field names and affected screen_id

# AC-0034-0023: Screen contract validator skips non-UI project
Scenario: Screen contract validator does not fire on non-UI project
  Given a non-UI discussion pack (surface_type: non-ui)
  When qfai validate runs
  Then no UIX-VAL-SCREEN-CONTRACT-* issues are reported
```

## AC Catalog (optional)

| AC-ID        | Title                                 | Notes                           | Priority |
| ------------ | ------------------------------------- | ------------------------------- | -------- |
| AC-0034-0001 | Taste interview 10 sections           | Core taste artifact contract    | P0       |
| AC-0034-0002 | Taste validator: missing              | Validator: existence check      | P0       |
| AC-0034-0003 | Taste validator: incomplete           | Validator: completeness check   | P0       |
| AC-0034-0004 | Taste validator: non-UI skip          | NFR-0002 safety                 | P0       |
| AC-0034-0005 | Trend scan with freshness             | Core trend artifact contract    | P0       |
| AC-0034-0006 | Trend validator: missing scan         | Validator: existence check      | P0       |
| AC-0034-0007 | Trend validator: missing freshness    | Validator: freshness metadata   | P0       |
| AC-0034-0008 | Trend validator: non-UI skip          | NFR-0002 safety                 | P0       |
| AC-0034-0009 | 3-layer model in new packs            | Core 3-layer contract           | P0       |
| AC-0034-0010 | 4-axis legacy warning                 | Migration window compliance     | P0       |
| AC-0034-0011 | Mixed model error                     | Consistency enforcement         | P0       |
| AC-0034-0012 | Validators/reviewers unified          | SSOT convergence                | P0       |
| AC-0034-0013 | Scoring-ready 16 fields               | Core scoring schema contract    | P0       |
| AC-0034-0014 | Scoring-ready validator: incomplete   | Validator: field completeness   | P0       |
| AC-0034-0015 | Aggregate scoring rules               | Scoring configuration           | P0       |
| AC-0034-0016 | Scoring-ready: non-UI skip            | NFR-0002 safety                 | P0       |
| AC-0034-0017 | Strategy 8 fields                     | Core strategy artifact contract | P0       |
| AC-0034-0018 | Weak strategy warning                 | Migration window compliance     | P0       |
| AC-0034-0019 | Strategy: non-UI skip                 | NFR-0002 safety                 | P0       |
| AC-0034-0020 | Screen contract 10 fields             | Core screen contract            | P1       |
| AC-0034-0021 | Multi-screen support                  | Array-based multi-screen        | P1       |
| AC-0034-0022 | Screen contract validator: incomplete | Validator: field completeness   | P1       |
| AC-0034-0023 | Screen contract: non-UI skip          | NFR-0002 safety                 | P1       |
