# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0031-0001
Scenario: User invokes premium mode and iteration loop starts
  Given a valid spec input set is available
  When the user invokes /qfai-prototyping-full-harness
  Then the premium mode initializes
  And the planner phase begins
  And the iteration loop starts with iteration counter at 1
```

```gherkin
# AC-0031-0002
Scenario: Missing spec inputs produces clear error before loop starts
  Given an incomplete or missing spec input set
  When the user invokes /qfai-prototyping-full-harness
  Then a structured error is returned describing the missing inputs
  And the iteration loop does not start
  And no partial artifacts are generated
```

```gherkin
# AC-0031-0003
Scenario: Planner produces generation strategy
  Given the premium mode has initialized with valid inputs
  When the planner phase executes
  Then a generation strategy is produced
  And the strategy contains approach, constraints, and iteration budget guidance
  And the strategy is passed as structured input to the generator
```

```gherkin
# AC-0031-0004
Scenario: Generator produces output from plan
  Given a valid generation strategy from the planner
  When the generator phase executes
  Then prototyping output is produced conforming to the plan constraints
  And the output is structured for evaluator scoring
```

```gherkin
# AC-0031-0005
Scenario: Evaluator scores output with calibration and optional critique
  Given generator output and a calibration pack (spec-0030)
  And an optional critique adapter (spec-0029)
  When the evaluator phase executes
  Then the output is scored using weighted dimensions
  And calibration baselines are applied
  And critique results are incorporated if available (fail-open if unavailable)
  And a decision of accept, refine, or pivot is produced
```

```gherkin
# AC-0031-0006
Scenario: Accept decision emits final output
  Given the evaluator produces an accept decision
  When the iteration loop processes the decision
  Then the final output is emitted
  And the loop terminates with accept status
  And evidence and review artifacts are generated
```

```gherkin
# AC-0031-0007
Scenario: Refine decision feeds back to generator
  Given the evaluator produces a refine decision with feedback
  When the iteration loop processes the decision
  Then the iteration counter increments
  And the evaluator feedback is passed to the generator
  And the generator produces an improved output
```

```gherkin
# AC-0031-0008
Scenario: Pivot decision signals replanning
  Given the evaluator produces a pivot decision
  When the iteration loop processes the decision
  Then the iteration counter increments
  And the planner is re-invoked with pivot context
  And a new generation strategy replaces the previous one
  And the generator receives the new strategy
```

```gherkin
# AC-0031-0009
Scenario: Max iteration cap reached with cap-reached status
  Given the configurable max iteration cap is set (default 15)
  And the evaluator has not produced an accept decision
  When the iteration counter reaches the max cap
  Then the best output so far is emitted
  And the loop terminates with cap-reached status
  And evidence and review artifacts are generated with cap-reached notation
```

```gherkin
# AC-0031-0010
Scenario: Evidence and review artifacts generated for every run
  Given a premium mode run completes (accept or cap-reached)
  When post-loop processing executes
  Then evidence artifacts are generated containing iteration history, scoring trace, and decision log
  And a review summary is generated for human reviewers
  And both artifacts are persisted regardless of termination reason
```

```gherkin
# AC-0031-0011
Scenario: Weighted scoring enforces dimension floors
  Given weighted scoring dimensions with configured floor values
  When the evaluator scores generator output
  Then each dimension is scored independently
  And if any dimension score falls below its floor
  Then the overall decision cannot be accept even if the weighted total exceeds the threshold
```

```gherkin
# AC-0031-0012
Scenario: Standard path performance unaffected by premium mode
  Given both standard (/qfai-prototyping) and premium (/qfai-prototyping-full-harness) skills exist
  When the standard path is executed
  Then its performance does not regress by more than 1% compared to baseline
  And no premium mode code paths are activated during standard execution
```

## AC Catalog (optional)

| AC-ID        | Title                             | Notes                                                | Priority |
| ------------ | --------------------------------- | ---------------------------------------------------- | -------- |
| AC-0031-0001 | Premium mode invocation and start | Loop initialization on valid input                   | P1       |
| AC-0031-0002 | Missing inputs error              | Pre-loop validation, structured error                | P1       |
| AC-0031-0003 | Planner strategy production       | Approach, constraints, budget guidance               | P1       |
| AC-0031-0004 | Generator output from plan        | Structured output for evaluator                      | P1       |
| AC-0031-0005 | Evaluator scoring with critique   | Weighted dimensions, calibration, fail-open critique | P1       |
| AC-0031-0006 | Accept decision final output      | Loop termination, evidence generation                | P1       |
| AC-0031-0007 | Refine decision feedback loop     | Generator re-invocation with feedback                | P1       |
| AC-0031-0008 | Pivot decision replanning         | Planner re-invocation with pivot context             | P1       |
| AC-0031-0009 | Max iteration cap enforcement     | Default 15, cap-reached status                       | P1       |
| AC-0031-0010 | Evidence and review generation    | Mandatory for every run                              | P1       |
| AC-0031-0011 | Weighted scoring dimension floors | Per-dimension floor enforcement                      | P1       |
| AC-0031-0012 | Standard path no regression       | <1% performance regression                           | P1       |
