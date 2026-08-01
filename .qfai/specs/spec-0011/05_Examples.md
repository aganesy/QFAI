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
- Given two items that both write the same shared fixture/mock file, or that
  mutate the same fixture instance
- When delivery-planner evaluates
- Then parallel dispatch is denied (the concurrent write violates independence)
- And the mere existence of a shared read-only fixture module, which neither
  item writes and each consumes as-is, is not a deny on its own

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

## EX-0011-0008: Simplified Handoff Parse

- BR-Ref: BR-0011-0007
- Given a `prototype-handoff.yaml` containing only `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes`
- When `/qfai-implement` parses the handoff
- Then no errors occur and no legacy field reads are attempted; if a legacy `mustPreserve` field is present, a schema warning is emitted and the field is ignored

## EX-0011-0009: Design System Mirror Read

- BR-Ref: BR-0011-0008
- Given `extractedDesignSystem` points to `.qfai/contracts/design/design-system.yaml` whose tables match root `DESIGN.md` byte-for-byte after parse normalization
- When `/qfai-implement` consumes the token tables
- Then the consumed tables equal the parsed root `DESIGN.md` tables; any drift is surfaced through the design contract validators
