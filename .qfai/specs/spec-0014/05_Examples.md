# 05 Examples

## EX-0014-0001

- Given verify runs on a UI-bearing repo
- When validate returns an error
- Then verify remains non-pass

## EX-0014-0002

- Given a review artifact says `REVISE`
- Then verify blocks completion

## EX-0014-0025

- Given a legacy design-system scoring artifact omits `designSystemCompliance`
- Then the relevant validator slice may still emit a finding according to its scoped semantics
