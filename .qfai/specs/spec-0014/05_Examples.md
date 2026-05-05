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

## EX-0014-0026

- BR-Ref: BR-0014-0005
- Given a UI-bearing repo with prototyping evidence under `.qfai/evidence/prototyping/iter-03/{home.png, home.html, review.json}`
- When `/qfai-verify` inspects evidence
- Then the iter-03 layout is accepted as the active SSOT and any required-path lookup against legacy `screenshots/` / `html/` directories is not raised

## EX-0014-0027

- BR-Ref: BR-0014-0006
- Given the verify gate documentation and `review-profiles.yml`
- When inspected
- Then no "full-harness profile", "perfect-100 completion gate", or "weighted-total scoring" wording appears; only the default profile remains active
