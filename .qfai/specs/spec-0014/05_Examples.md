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
- Given a `prototyping.json` that carries a legacy `fullHarness: { ... }` block from a pre-1.8.9 run
- When `prototyping iterate` runs cycle 0 (the hard-reset cycle)
- Then the live `prototyping.json` no longer contains the `fullHarness` key after the cycle, so the post-1.8.9 evolution loop never re-reads stale runtime state

## EX-0014-0029

- BR-Ref: BR-0014-0025
- Given a SaaS-tenant project whose prototyping evidence is complete but whose ATDD / implement-class gates were skipped
- When `qfai prototyping certify --scope saas-package` is run
- Then the sealed `completion-certificate.json` contains `scope: "saas-package"` and `notes: "skipped: atdd-class gate; implement-class gate"`, does not assert full DONE, and a subsequent `--upgrade-scope full` before the gates land is rejected with a message naming the still-missing gates; after both gates PASS the same flag upgrades the certificate to full scope
