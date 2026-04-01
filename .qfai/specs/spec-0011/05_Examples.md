# 05 Examples

## EX-0011-0001: Normal TDD Cycle

- BR-Ref: BR-0011-0002, BR-0011-0003
- Given TDD-0001 with status `todo`
- When implement runs: write failing test -> observe RED -> write minimal code -> observe GREEN -> refactor -> reviewers PASS
- Then status transitions: todo -> red -> green -> refactor -> done

## EX-0011-0002: Backward Transition Blocked

- BR-Ref: BR-0011-0002
- Given TDD-0002 with status `green`
- When transition to `red` is attempted
- Then error "Backward transition prohibited: green -> red" is produced

## EX-0011-0003: Exception Without DR-ID

- BR-Ref: BR-0011-0002
- Given TDD-0003 transitioning to `exception`
- When DR-ID column is empty
- Then error "exception status requires DR-ID in DR-ID column" is produced

## EX-0011-0004: Stale Evidence Rejected

- BR-Ref: BR-0011-0005
- Given TDD-0004 with evidence from a previous run
- When completion is checked
- Then stale evidence is rejected and fresh evidence is required

## EX-0011-0005: Parallel Dispatch Denied

- BR-Ref: BR-0011-0001
- Given two items sharing the same fixture/mock
- When delivery-planner evaluates
- Then parallel dispatch is denied (shared fixture violates independence)

## EX-0011-0006: Coverage Placeholder for BR-0011-0004

- BR-Ref: BR-0011-0004
- Given the consolidated rule BR-0011-0004
- When layer coverage is evaluated
- Then at least one example exists for BR-0011-0004

## EX-0011-0007: Coverage Placeholder for BR-0011-0006

- BR-Ref: BR-0011-0006
- Given the consolidated rule BR-0011-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0011-0006
