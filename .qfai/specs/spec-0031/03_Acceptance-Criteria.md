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
| AC-0031-0013 | Dedicated skill registration exists | v1.7.7 Remediation, REQ-0002                       | P1       |
| AC-0031-0014 | SKILL.md contains evidence and reviewer policy | v1.7.7 Remediation, REQ-0002, REQ-0014 | P1 |
| AC-0031-0015 | SKILL.md positions skill in three-mode structure | v1.7.7 Remediation, REQ-0003, REQ-0010 | P1 |
| AC-0031-0016 | Full-harness skill accepts routing from standard skill | v1.7.7 Remediation, REQ-0002, REQ-0010 | P1 |

---

## [v1.7.7 Remediation] AC Gherkin

```gherkin
# AC-0031-0013
Scenario: Dedicated /qfai-prototyping-full-harness skill is registered
  Given the QFAI skill system is loaded
  When the skill registry is inspected
  Then /qfai-prototyping-full-harness exists as a named registered skill
  And its SKILL.md is present and parseable
  And it is not activated through any flag or configuration on /qfai-prototyping

# AC-0031-0014
Scenario: SKILL.md contains explicit evidence and reviewer policy
  Given the /qfai-prototyping-full-harness SKILL.md is read
  When its contents are inspected
  Then it contains an evidence policy section listing: iteration history, scoring trace, decision log
  And it contains a reviewer expectations section describing what fields to check and what scores to examine
  And it documents termination-reason reporting (accept / cap-reached)
  And `qfai validate` passes with this SKILL.md present

# AC-0031-0015
Scenario: SKILL.md positions full-harness in three-mode structure
  Given the /qfai-prototyping-full-harness SKILL.md is read
  When its mode context section is inspected
  Then it states that full-harness is the third tier in the low-cost / standard / full-harness structure
  And it cross-references /qfai-prototyping for low-cost and standard tiers
  And it states the runtime requirements and evidence level specific to full-harness

# AC-0031-0016
Scenario: Full-harness skill accepts invocation after routing from standard skill
  Given the standard /qfai-prototyping skill emits routing guidance to /qfai-prototyping-full-harness
  When the user follows the guidance and invokes /qfai-prototyping-full-harness with the same spec inputs
  Then the skill initializes successfully
  And the iteration loop starts
  And no error occurs due to routing context
```
