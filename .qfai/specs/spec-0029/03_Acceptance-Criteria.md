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

## AC Catalog (optional)

| AC-ID   | Title                          | Notes                   | Priority |
| ------- | ------------------------------ | ----------------------- | -------- |
| AC-0029-0001 | Structured critique response   | Core interface contract | P1       |
| AC-0029-0002 | Generic command execution      | Command provider        | P1       |
| AC-0029-0003 | Injection prevention           | Security                | P1       |
| AC-0029-0004 | Fail-open on unavailability    | Core reliability        | P1       |
| AC-0029-0005 | Malformed response handling    | Robustness              | P1       |
| AC-0029-0006 | Timeout handling               | Reliability             | P2       |
| AC-0029-0007 | Example providers available    | Developer experience    | P2       |
| AC-0029-0008 | Mid-loop provider state change | Edge case               | P2       |
