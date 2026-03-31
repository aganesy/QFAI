# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0030-0001
Scenario: Calibration pack loaded and scoring alignment applied
  Given a calibration pack file exists at the configured path
  When the harness session starts
  Then the calibration pack is loaded into memory
  And scoring alignment examples are available to all reviewers
  And each alignment example contains input, expected score, and rationale
```

```gherkin
# AC-0030-0002
Scenario: Calibration pack missing triggers default fallback with warning
  Given no calibration pack file exists at the configured path
  When the harness session starts
  Then the system falls back to built-in default scoring parameters
  And a warning is emitted indicating the missing calibration pack
  And the session proceeds without interruption
```

```gherkin
# AC-0030-0003
Scenario: Accept/refine/pivot thresholds configurable
  Given a qfai.config.yaml with custom thresholds
  When the harness reads the configuration
  Then the accept threshold is set to the configured value
  And the refine threshold is set to the configured value
  And the pivot threshold is set to the configured value
  And all thresholds are numeric values between 0.0 and 1.0
```

```gherkin
# AC-0030-0004
Scenario: Accept decision when score exceeds threshold
  Given the accept threshold is 0.8
  And the aggregated reviewer score is 0.85
  When the loop controller evaluates the score
  Then the decision is "accept"
  And the loop terminates with success status
```

```gherkin
# AC-0030-0005
Scenario: Refine decision with feedback to generator
  Given the accept threshold is 0.8
  And the refine threshold is 0.5
  And the aggregated reviewer score is 0.65
  When the loop controller evaluates the score
  Then the decision is "refine"
  And reviewer feedback is forwarded to the generator for the next iteration
```

```gherkin
# AC-0030-0006
Scenario: Pivot decision signals replanning
  Given the pivot threshold is 0.5
  And the aggregated reviewer score is 0.35
  When the loop controller evaluates the score
  Then the decision is "pivot"
  And a replanning signal is emitted to the orchestrator
  And the current generation approach is marked as abandoned
```

```gherkin
# AC-0030-0007
Scenario: Reviewer disagreement resolved by majority rule (interim)
  Given 3 reviewers return scores [0.9, 0.4, 0.85]
  When the harness aggregates reviewer scores
  Then the majority decision is determined by counting accept/refine/pivot classifications per reviewer
  And the majority classification becomes the aggregated decision
  And in case of a tie the highest-confidence reviewer score breaks the tie
```

```gherkin
# AC-0030-0008
Scenario: Plateau detected via score delta with 3-iteration lookback
  Given the plateau delta threshold is 0.02
  And the last 3 iteration scores are [0.71, 0.72, 0.72]
  When the loop controller checks for plateau
  Then a plateau is detected because the score delta over 3 iterations is 0.01
  And the loop exits with plateau status
```

```gherkin
# AC-0030-0009
Scenario: Loop exits on max iteration cap
  Given the max iteration cap is 15 (NFR-0001)
  And the current iteration count is 15
  When the loop controller checks exit conditions
  Then the loop exits with max-iterations-reached status
  And the best score across all iterations is reported
```

```gherkin
# AC-0030-0010
Scenario: Calibration pack updated mid-session picked up next iteration
  Given a calibration pack is loaded at session start
  And the calibration pack file is updated on disk during the session
  When the next iteration begins
  Then the updated calibration pack is reloaded
  And the new scoring alignment is applied from that iteration onward
```

```gherkin
# AC-0030-0011
Scenario: Calibration pack with 3-layer thresholds validates successfully
  Given a calibration pack that defines thresholds for invariant, trend-derived, and product-specific layers
  When the calibration loader validates the pack
  Then validation succeeds
  And all three layer thresholds are loaded into the scoring engine
```

```gherkin
# AC-0030-0012
Scenario: Calibration pack referencing legacy 4-axis dimension is rejected
  Given a calibration pack that references a legacy dimension (e.g., "usability" or "delight")
  When the calibration loader validates the pack
  Then validation fails with an error naming the invalid dimension
  And migration guidance is included in the error message
  And the session does not start with the invalid pack
```

```gherkin
# AC-0030-0013
Scenario: Calibration pack with empty product-specific section accepted with generic defaults
  Given a calibration pack where the product-specific section is empty or absent
  When the calibration loader validates the pack
  Then the pack is accepted
  And the product-specific threshold defaults to the "generic" built-in value
  And a notice is emitted indicating the default was applied
```

```gherkin
# AC-0030-0014
Scenario: Calibration threshold change requires maintainer approval
  Given a proposed change to a calibration threshold value
  When the change is submitted without a spec delta entry and DR reference
  Then the change is rejected with a traceability error
  And no calibration file is updated
```

```gherkin
# AC-0030-0015
Scenario: 4-axis calibration migrated to 3-layer preserves existing scores
  Given a legacy 4-axis calibration pack with score data
  When the migration utility maps the pack to the 3-layer format
  Then all existing score values are preserved in the output
  And the output pack validates against the 3-layer calibration schema
```

```gherkin
# AC-0030-0016
Scenario: Calibration run twice on same data produces identical thresholds
  Given a valid 3-layer calibration pack
  When calibration is run twice on the same dataset with the same configuration
  Then both runs produce identical threshold values
  And no non-deterministic variance is introduced
```

## AC Catalog (optional)

| AC_ID        | Title                                         | Notes                       | Priority |
| ------------ | --------------------------------------------- | --------------------------- | -------- |
| AC-0030-0001 | Calibration pack loaded and alignment applied | REQ-0006                    | P1       |
| AC-0030-0002 | Missing calibration pack fallback             | REQ-0006                    | P1       |
| AC-0030-0003 | Configurable thresholds                       | REQ-0008                    | P1       |
| AC-0030-0004 | Accept decision                               | REQ-0008                    | P1       |
| AC-0030-0005 | Refine decision with feedback                 | REQ-0008                    | P1       |
| AC-0030-0006 | Pivot decision signals replanning             | REQ-0008                    | P1       |
| AC-0030-0007 | Reviewer disagreement majority rule           | REQ-0009                    | P1       |
| AC-0030-0008 | Plateau detection via score delta             | REQ-0010                    | P1       |
| AC-0030-0009 | Loop exit on max iteration cap                | REQ-0010                    | P1       |
| AC-0030-0010 | Mid-session calibration pack update           | NFR-0004                    | P2       |
| AC-0030-0011 | 3-layer pack validates successfully           | DR-0080                     | P1       |
| AC-0030-0012 | Legacy 4-axis dimension rejected              | Migration guidance included | P1       |
| AC-0030-0013 | Empty product-specific uses generic defaults  | Accepted with notice        | P1       |
| AC-0030-0014 | Threshold change requires maintainer approval | Traceability gate           | P1       |
| AC-0030-0015 | 4-axis migration preserves scores             | No data loss                | P1       |
| AC-0030-0016 | Idempotent calibration thresholds             | Same data = same result     | P2       |
