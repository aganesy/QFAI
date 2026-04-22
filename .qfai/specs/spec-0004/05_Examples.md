# 05 Examples

## EX-0004-0001

- Given a screen contract declares `orders-dashboard`
- And screenshot evidence is missing
- Then validate emits `QFAI-UIE-001`

## EX-0004-0002

- Given a screen contract declares `orders-dashboard`
- And HTML evidence is missing
- Then validate emits `QFAI-UIE-002`

## EX-0004-0003

- Given no screen contract exists
- Then `validateUiEvidenceArtifacts` returns no issue
