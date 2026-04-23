# 05 Examples

## EX-0014-0001

- BR-Ref: BR-0014-0001, BR-0014-0003
- Given verify runs on a UI-bearing repo
- When validate returns an error
- Then verify remains non-pass

## EX-0014-0002

- BR-Ref: BR-0014-0002
- Given a review artifact says `REVISE`
- Then verify blocks completion

## EX-0014-0025

- BR-Ref: BR-0014-0004
- Given a legacy design-system scoring artifact omits `designSystemCompliance`
- Then the relevant validator slice may still emit a finding according to its scoped semantics
