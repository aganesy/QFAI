# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0032-0001: Cost/time metrics emitted per iteration
Scenario: Per-iteration metrics emitted
  Given a QFAI run with multiple iterations
  When each iteration completes
  Then cost and time metrics are emitted for that iteration
  And each metric record includes iteration index, wall-clock duration, and token cost

# AC-0032-0002: Aggregate metrics emitted at run completion
Scenario: Aggregate metrics at run end
  Given a QFAI run that has completed all iterations
  When the run finalizes
  Then aggregate metrics are emitted summarizing total cost, total time, and iteration count
  And the aggregate references the individual iteration metric IDs

# AC-0032-0003: Metrics emitted even for single-iteration runs
Scenario: Single-iteration run emits both per-iteration and aggregate
  Given a QFAI run configured for a single iteration
  When the run completes
  Then one per-iteration metric record is emitted
  And one aggregate metric record is emitted
  And both records are consistent

# AC-0032-0004: Observability sink unavailable; metrics buffered locally
Scenario: Metrics buffered when sink is unavailable
  Given a configured observability sink that is unreachable
  When a QFAI run emits metrics
  Then the metrics are buffered to a local file
  And a warning is logged indicating sink unavailability
  And the run is not blocked by the sink failure

# AC-0032-0005: Mode guidance recommends standard vs premium
Scenario: Mode guidance based on project characteristics
  Given a project with known characteristics (size, complexity, test coverage)
  When mode guidance is requested
  Then a recommendation of standard or premium is returned
  And the recommendation includes the reasoning dimensions used

# AC-0032-0006: Reviewer drift detected between runs
Scenario: Reviewer drift detection across runs
  Given two or more completed runs on the same project
  When drift analysis is executed
  Then the system compares finding distributions and severity patterns
  And reports a drift score indicating the degree of divergence
  And flags dimensions where drift exceeds the configured threshold

# AC-0032-0007: Capability profile generated for project
Scenario: Capability profile generation
  Given a project with existing spec coverage, test results, and code metrics
  When capability profile assessment is invoked
  Then a structured profile is generated
  And the profile includes dimensions: test maturity, spec coverage, code complexity, observability readiness

# AC-0032-0008: Historical metrics accessible per user
Scenario: Historical metrics retrieval
  Given a user with previous QFAI runs
  When the user requests historical metrics
  Then per-run aggregate metrics are returned in chronological order
  And each entry includes run ID, timestamp, total cost, and total time
```

## AC Catalog (optional)

| AC-ID   | Title                           | Notes                       | Priority |
| ------- | ------------------------------- | --------------------------- | -------- |
| AC-0032-0001 | Per-iteration metrics           | Core observability          | P1       |
| AC-0032-0002 | Aggregate metrics               | Core observability          | P1       |
| AC-0032-0003 | Single-iteration metrics        | Edge case                   | P1       |
| AC-0032-0004 | Sink unavailable buffering      | Reliability / fail-open     | P1       |
| AC-0032-0005 | Mode guidance recommendation    | Advisory output             | P2       |
| AC-0032-0006 | Reviewer drift detection        | Cross-run analysis          | P2       |
| AC-0032-0007 | Capability profile generation   | Project assessment          | P2       |
| AC-0032-0008 | Historical metrics retrieval    | User-facing data access     | P2       |
