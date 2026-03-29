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

## AC Catalog (optional)

| AC_ID        | Title                                         | Notes    | Priority |
| ------------ | --------------------------------------------- | -------- | -------- |
| AC-0030-0001 | Calibration pack loaded and alignment applied | REQ-0006 | P1       |
| AC-0030-0002 | Missing calibration pack fallback             | REQ-0006 | P1       |
| AC-0030-0003 | Configurable thresholds                       | REQ-0008 | P1       |
| AC-0030-0004 | Accept decision                               | REQ-0008 | P1       |
| AC-0030-0005 | Refine decision with feedback                 | REQ-0008 | P1       |
| AC-0030-0006 | Pivot decision signals replanning             | REQ-0008 | P1       |
| AC-0030-0007 | Reviewer disagreement majority rule           | REQ-0009 | P1       |
| AC-0030-0008 | Plateau detection via score delta             | REQ-0010 | P1       |
| AC-0030-0009 | Loop exit on max iteration cap                | REQ-0010 | P1       |
| AC-0030-0010 | Mid-session calibration pack update           | NFR-0004 | P2       |
