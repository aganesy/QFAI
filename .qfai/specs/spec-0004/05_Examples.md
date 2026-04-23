# 05 Examples

## EX-0004-0001

- BR-Ref: BR-0004-0003
- Given a screen contract declares `orders-dashboard`
- And screenshot evidence is missing
- Then validate emits `QFAI-UIE-001`

## EX-0004-0002

- BR-Ref: BR-0004-0004
- Given a screen contract declares `orders-dashboard`
- And HTML evidence is missing
- Then validate emits `QFAI-UIE-002`

## EX-0004-0003

- BR-Ref: BR-0004-0005
- Given no screen contract exists
- Then `validateUiEvidenceArtifacts` returns no issue

## EX-0004-0004

- BR-Ref: BR-0004-0001, BR-0004-0002
- Given `qfai validate` runs on a repo with canonical validators enabled
- Then deterministic validator findings are aggregated through the canonical validate path

## EX-0004-0005

- BR-Ref: BR-0004-0006
- Given the prototyping skill contains stale runtime or CLI wording
- Then the skill validator emits a finding instead of silently accepting the drift

## EX-0004-0006

- BR-Ref: BR-0004-0007
- Given a legacy design-system validator slice is still wired in code
- When its prerequisite artifact exists
- Then validate may emit the scoped legacy finding without restoring a removed runtime contract
