# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0027-0001
Scenario: UIX-VAL-SIDECAR-MISSING fires when uiux/ absent from UI-bearing pack
  Given a discussion pack classified as UI-bearing
  And the pack does not contain a uiux/ sidecar directory
  When qfai validate runs UIX-VAL checks
  Then an issue with rule ID UIX-VAL-SIDECAR-MISSING is emitted
  And severity is error
  And the fix suggestion includes "create uiux/ sidecar directory"
```

```gherkin
# AC-0027-0002
Scenario: UIX-VAL-STRATEGY-INCOMPLETE fires when strategy fields missing or below 20-char threshold
  Given a UI-bearing pack with uiux/10_strategy.md
  And the verification_expectations field contains fewer than 20 characters
  When qfai validate runs UIX-VAL checks
  Then an issue with rule ID UIX-VAL-STRATEGY-INCOMPLETE is emitted
  And the description indicates which required field failed the 20-char minimum
  And the fix suggestion specifies the minimum content requirement
```

```gherkin
# AC-0027-0003
Scenario: UIX-VAL scoring axes validation
  Given a UI-bearing pack with scoring axis files (uiux/20-23)
  And a trend-derived axis is missing source translation
  When qfai validate runs UIX-VAL checks
  Then an issue is emitted for the incomplete scoring axis
  And the rule ID follows the UIX-VAL-* pattern
  And the file path points to the specific axis file
```

```gherkin
# AC-0027-0004
Scenario: UIX-VAL option comparison and anchor validation
  Given a UI-bearing pack with uiux/30_comparison.md and uiux/31_anchor.md
  And the comparison contains fewer than 2 options
  When qfai validate runs UIX-VAL checks
  Then an issue is emitted for insufficient option count
  And the fix suggestion indicates "at least 2 options required"
```

```gherkin
# AC-0027-0005
Scenario: UIX-VAL screen contract minimum structure validation
  Given a UI-bearing pack with uiux/40_contracts.md
  And a screen contract is missing the observable_outcomes field
  When qfai validate runs UIX-VAL checks
  Then an issue is emitted for incomplete screen contract
  And the description identifies the missing field among route, actor, purpose, primary_tasks, required_states, transitions, or observable_outcomes
```

```gherkin
# AC-0027-0006
Scenario: UIX-VAL OQ closure readiness validation
  Given a UI-bearing pack with open critical OQs
  When qfai validate runs UIX-VAL checks
  Then an issue is emitted for each blocking OQ
  And severity is error
  And the description identifies the specific OQ ID
```

```gherkin
# AC-0027-0007
Scenario: Non-UI projects produce zero UIX issues
  Given a project with no UI-bearing signals (no style tags, no div tags, no Mermaid screen flows, no uiux/ directory, no screen contracts)
  When qfai validate runs
  Then exactly zero UIX-VAL-* issues are emitted
  And exactly zero UIX-REV-* issues are emitted
  And the issue array for UIX checks is empty
```

```gherkin
# AC-0027-0008
Scenario: UI-bearing detection uses explicit surface classification as primary SSOT
  Given a discussion pack declares `surface: web-ui`
  When the UI-bearing detection function evaluates the pack
  Then the pack is classified as UI-bearing
  And UIX-VAL checks are activated
```

```gherkin
# AC-0027-0009
Scenario: UI-bearing detection uses content signals only as fallback
  Given a discussion pack does not declare explicit surface classification
  And it contains a screen-flow Mermaid diagram outside code fences
  When the UI-bearing detection function evaluates the pack
  Then the pack is classified as UI-bearing
  And fallback activation is recorded without overriding an explicit surface declaration
```

```gherkin
# AC-0027-0010
Scenario: UIX-REV prompts produce accept/refine/pivot recommendations
  Given a UI-bearing pack with complete UIX artifacts
  When UIX-REV semantic review runs
  Then the output contains a recommendation of accept, refine, or pivot
  And each recommendation includes a rationale
```

```gherkin
# AC-0027-0011
Scenario: UIX-REV covers all semantic review categories
  Given UIX-REV prompt templates are registered
  Then templates exist for strategy selection review
  And templates exist for axis overlap detection
  And templates exist for trend translation adequacy
  And templates exist for product-specificity assessment
  And templates exist for anchor weakness identification
  And templates exist for generic fallback risk detection
```

```gherkin
# AC-0027-0012
Scenario: Report includes rule ID, file path, severity, description, and fix suggestion
  Given qfai validate has completed with UIX-VAL issues
  When the report is generated
  Then every issue object contains a ruleId field
  And every issue object contains a filePath field
  And every issue object contains a severity field
  And every issue object contains a description field
  And every issue object contains a fixSuggestion field
```

```gherkin
# AC-0027-0013
Scenario: Migration detects missing uiux/ sidecar and provides step-by-step guidance
  Given a legacy UI-bearing project without uiux/ sidecar
  When qfai validate runs migration checks
  Then an issue is emitted with migration guidance
  And the guidance includes step-by-step instructions to create uiux/ sidecar
  And the guidance references the 11-file sidecar template
```

```gherkin
# AC-0027-0014
Scenario: Migration checks default to warning severity
  Given a legacy project with missing uiux/ sidecar
  And no explicit migration configuration is set
  When qfai validate runs migration checks
  Then migration-related issues have severity warning
  And the pipeline is not blocked
```

```gherkin
# AC-0027-0015
Scenario: Migration checks escalate to error when uiux.migration.strict is true
  Given a legacy project with missing uiux/ sidecar
  And config contains uiux.migration.strict: true
  When qfai validate runs migration checks
  Then migration-related issues have severity error
  And the pipeline is blocked
```

```gherkin
# AC-0027-0016
Scenario: Stale asset detection with migration guidance
  Given a UI-bearing project with uiux/ sidecar containing outdated template versions
  When qfai validate runs migration checks
  Then an issue is emitted for stale assets
  And severity is warning (default)
  And the fix suggestion includes template version upgrade steps
```

```gherkin
# AC-0027-0017
Scenario: Verify-pack tests cover pass and fail fixtures per UIX-VAL rule
  Given a UIX-VAL rule (e.g., UIX-VAL-SIDECAR-MISSING)
  When verify-pack tests execute
  Then a pass fixture exists that produces zero issues for that rule
  And a fail fixture exists that produces exactly the expected issue for that rule
```

```gherkin
# AC-0027-0018
Scenario: Static/runtime boundary protection
  Given the UIX-VAL-* validator source code
  When inspected for runtime dependencies
  Then no browser, network, or rendering dependencies are imported
  And no runtime-dependent checks are present
  And the boundary between static validation and runtime evidence is clean
```

```gherkin
# AC-0027-0019
Scenario: Validator determinism across 10 runs
  Given a UI-bearing pack fixture
  When the same fixture is validated 10 times consecutively
  Then all 10 runs produce identical issue sets
  And issue ordering is deterministic
```

```gherkin
# AC-0027-0020
Scenario: Performance budget for all UIX-VAL validators combined
  Given a standard UI-bearing pack fixture
  When all UIX-VAL-* validators run in sequence
  Then total execution time is under 2000ms
```

```gherkin
# AC-0027-0021
Scenario: CHANGELOG test count correction
  Given the CHANGELOG entry for v1.7.3
  When the test count is verified
  Then the count reads 26 tests (not 25)
  And the correction is committed as part of v1.7.4
```

## AC Catalog (optional)

| AC-ID        | Title                           | Notes                            | Priority |
| ------------ | ------------------------------- | -------------------------------- | -------- |
| AC-0027-0001 | Sidecar missing detection       | UIX-VAL-SIDECAR-MISSING rule     | P1       |
| AC-0027-0002 | Strategy completeness           | 20-char threshold                | P1       |
| AC-0027-0003 | Scoring axes validation         | Trend-derived translation        | P1       |
| AC-0027-0004 | Option comparison and anchor    | 2+ options required              | P1       |
| AC-0027-0005 | Screen contract structure       | states, outcomes, transitions    | P1       |
| AC-0027-0006 | OQ closure readiness            | Blocking OQ detection            | P1       |
| AC-0027-0007 | Non-UI zero issues              | Empty issue array                | P1       |
| AC-0027-0008 | UI-bearing surface primary      | explicit surface classification  | P1       |
| AC-0027-0009 | UI-bearing fallback signals     | content heuristic with guardrails | P1      |
| AC-0027-0010 | UIX-REV accept/refine/pivot     | Recommendation output            | P1       |
| AC-0027-0011 | UIX-REV category coverage       | 6 review categories              | P1       |
| AC-0027-0012 | Report field completeness       | 5 required fields per issue      | P1       |
| AC-0027-0013 | Migration sidecar detection     | Step-by-step guidance            | P1       |
| AC-0027-0014 | Migration warning default       | Pipeline not blocked             | P1       |
| AC-0027-0015 | Migration strict escalation     | uiux.migration.strict: true      | P1       |
| AC-0027-0016 | Stale asset detection           | Template version upgrade         | P2       |
| AC-0027-0017 | Verify-pack pass/fail fixtures  | Per UIX-VAL rule                 | P1       |
| AC-0027-0018 | Static/runtime boundary         | No runtime dependencies          | P1       |
| AC-0027-0019 | Validator determinism           | 10-run identical output          | P1       |
| AC-0027-0020 | Performance budget              | 2000ms combined                  | P1       |
| AC-0027-0021 | CHANGELOG test count correction | 25 -> 26                         | P1       |
