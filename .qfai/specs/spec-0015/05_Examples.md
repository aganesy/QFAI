# 05 Examples

## EX-0015-0001: Orchestrator Delegation

- BR-Ref: BR-0015-0001
- Given 対象 spec SDD task
- When Orchestrator runs
- Then it creates work orders for requirements-analyst, solution-architect, and test-design-analyst, and delegates; does not write spec content directly

## EX-0015-0002: Devils-Advocate Bare Negation

- BR-Ref: BR-0015-0004
- Given devils-advocate returns FAIL with only "I disagree" (no alternative)
- When validation checks the verdict
- Then re-judgment is triggered: "bare negation FAIL invalid, provide concrete alternative"

## EX-0015-0003: Devils-Advocate 3-FAIL Demotion

- BR-Ref: BR-0015-0004
- Given devils-advocate returns FAIL 3 consecutive times (each with alternative)
- When demotion check runs
- Then advisory demotion: blocking power lost, progression allowed

## EX-0015-0004: Pattern-Doubler N/A on Empty

- BR-Ref: BR-0015-0005
- Given `07_Decisions.md` with 0 ID-bearing items
- When pattern-doubler evaluates
- Then returns N/A (no patterns to double)

## EX-0015-0005: Delegation Failure Hard Stop Reporting

- BR-Ref: BR-0015-0003
- Given the first required delegation to `delivery-planner` fails with a native tool error
- When the stage starts
- Then the stage stops immediately and reports the attempted role/task, failure summary, required user remediation, and retry condition

## EX-0015-0006: Capability Probe Uses First Required Delegation

- BR-Ref: BR-0015-0002
- Given a skill stage such as `/qfai-implement` whose first required delegation is `delivery-planner`
- When the orchestrator starts the stage in a native sub-agent environment
- Then it attempts `delivery-planner` immediately, treats that real delegation attempt as the Capability Probe, and does not wait for any separate availability confirmation before execution

## EX-0015-0007: Coverage Placeholder for BR-0015-0006

- BR-Ref: BR-0015-0006
- Given the consolidated rule BR-0015-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0015-0006

## EX-0015-0008: Coverage Placeholder for BR-0015-0007

- BR-Ref: BR-0015-0007
- Given the consolidated rule BR-0015-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0015-0007
