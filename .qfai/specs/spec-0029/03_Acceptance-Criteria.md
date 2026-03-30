# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0029-0001: Provider interface accepts and returns structured critique
Scenario: Provider returns structured critique
  Given a registered critique provider
  When the evaluator requests critique for a generated output
  Then the provider returns a response matching the structured schema
  And the response includes scores, dimensions, and suggestions

# AC-0029-0002: Generic command provider executes external process
Scenario: Generic command provider execution
  Given a generic command provider configured with a command template
  When the evaluator sends a critique request
  Then the provider executes the configured command with sanitized arguments
  And returns the structured response parsed from command output

# AC-0029-0003: Provider arguments are sanitized against injection
Scenario: Command injection prevention
  Given a generic command provider
  When the critique request contains shell metacharacters
  Then the provider sanitizes or escapes the arguments before execution
  And no shell injection occurs

# AC-0029-0004: Provider unavailability triggers fail-open
Scenario: Provider failure triggers fail-open
  Given a critique provider that is unavailable or returns an error
  When the evaluator requests critique
  Then the adapter logs a warning with the failure reason
  And returns a fail-open response (no critique)
  And the evaluation loop continues without blocking

# AC-0029-0005: Provider returns malformed response
Scenario: Malformed provider response handling
  Given a critique provider that returns a malformed response
  When the evaluator requests critique
  Then the adapter validates the response against the schema
  And logs a warning about the malformed response
  And treats it as a fail-open (no usable critique)

# AC-0029-0006: Provider timeout handling
Scenario: Provider timeout at configured threshold
  Given a critique provider with a configured timeout
  When the provider exceeds the timeout threshold
  Then the adapter treats the timeout as provider unavailability
  And triggers fail-open semantics

# AC-0029-0007: Multiple example providers are available
Scenario: Example providers exist and are functional
  Given the QFAI installation
  When a user configures an example critique provider
  Then at least 2 example providers are available
  And each example provider conforms to the provider interface

# AC-0029-0008: Provider state transition mid-loop
Scenario: Provider becomes unavailable mid-iteration
  Given a critique provider available for iterations 1-3
  When the provider becomes unavailable at iteration 4
  Then iterations 4+ continue with fail-open (no critique)
  And previous critique results are preserved
```

```gherkin
# AC-0029-0009: 3-layer model scores produced by critique adapter
Scenario: Critique adapter produces 3-layer scores
  Given a critique provider configured for the 3-layer model
  When the evaluator requests critique for a generated output
  Then the response includes scores for invariant, trend-derived, and product-specific layers
  And no legacy 4-axis dimension (usability, consistency, accessibility, delight) is used as a layer key
```

```gherkin
# AC-0029-0010: Calibration pack with undefined 4th axis rejected
Scenario: Validation rejects calibration pack with undeclared axis
  Given a calibration pack that references a 4th axis not defined in the 3-layer architecture
  When the critique adapter validates the calibration pack
  Then validation fails with a descriptive error naming the undeclared axis
  And evaluation does not proceed with the invalid pack
```

```gherkin
# AC-0029-0011: Layer boundary score assignment is deterministic
Scenario: Score on exact layer boundary assigns deterministically
  Given a score that falls exactly on a layer boundary threshold
  When the adapter assigns the score to a layer
  Then the assignment is deterministic and consistent across multiple invocations
  And no ties or ambiguous assignment results are emitted
```

```gherkin
# AC-0029-0012: Existing scores re-mapped to 3-layer without data loss
Scenario: Migration from ad-hoc scoring to 3-layer model preserves data
  Given existing critique scores produced under the legacy ad-hoc model
  When the architecture migrates to the 3-layer model
  Then each legacy score is re-mapped to one of the three layers
  And no score data is discarded during migration
```

```gherkin
# AC-0029-0013: Idempotent scoring under 3-layer model
Scenario: Same input scored twice produces identical results
  Given the 3-layer critique adapter is configured
  When the same input is evaluated twice with the same configuration
  Then both evaluations return identical layer assignments and scores
  And no non-deterministic variance is introduced
```

## AC Catalog (optional)

| AC-ID        | Title                          | Notes                       | Priority |
| ------------ | ------------------------------ | --------------------------- | -------- |
| AC-0029-0001 | Structured critique response   | Core interface contract     | P1       |
| AC-0029-0002 | Generic command execution      | Command provider            | P1       |
| AC-0029-0003 | Injection prevention           | Security                    | P1       |
| AC-0029-0004 | Fail-open on unavailability    | Core reliability            | P1       |
| AC-0029-0005 | Malformed response handling    | Robustness                  | P1       |
| AC-0029-0006 | Timeout handling               | Reliability                 | P2       |
| AC-0029-0007 | Example providers available    | Developer experience        | P2       |
| AC-0029-0008 | Mid-loop provider state change | Edge case                   | P2       |
| AC-0029-0009 | 3-layer model scores produced  | invariant/trend/product     | P1       |
| AC-0029-0010 | Undeclared axis rejected       | Validation rejects 4th axis | P1       |
| AC-0029-0011 | Boundary score deterministic   | No ambiguous assignment     | P1       |
| AC-0029-0012 | Migration without data loss    | Legacy re-mapped            | P1       |
| AC-0029-0013 | Idempotent 3-layer scoring     | Same input = same scores    | P2       |
