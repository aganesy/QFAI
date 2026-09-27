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

## EX-0014-0030

- BR-Ref: BR-0014-0026
- Given an orchestrated verify work order for stage instance `verify-1`, and a verify run whose gates pass
- When the stage writes `.qfai/report/verify.json` with `status: "PASS"` and `scope: "full"` and returns
- Then its `artifactRefs` name that `.qfai/report/verify.json` with the digest of the file this stage wrote
- And its `reviewResults` hold the qa-gatekeeper verdict, from a reviewer instance that authored nothing in the run
- And its `gateResults` are reported as information only, since `finish` decides the gates

## EX-0014-0031

- BR-Ref: BR-0014-0027
- Given a verify work order targeting one spec, and two reports already on disk: a `verify.json` with `status: "PASS"` whose `specId` names another spec, and a `verify.json` another run's verify stage left under its own report copy
- When the verify stage returns
- Then neither file is named in `artifactRefs`
- And the stage runs its own gates, writes its own `.qfai/report/verify.json` and names that file

## EX-0014-0032

- BR-Ref: BR-0014-0028
- Given a verify stage whose required `validate` gate ran and passed, and whose required E2E gate could not start because the browser the harness needs is not installed
- When the stage returns
- Then its `outcome` and its `testObservation` are reported as two separate fields
- And the E2E gate is reported `unrun`, never as a pass, and `verify.json` does not record `status: "PASS"`

## EX-0014-0033

- BR-Ref: BR-0014-0029
- Given the verify stage of a run that returns `accepted_with_debt`
- When it writes `verify.json`
- Then the file carries only the fields `status`, `scope`, `specId`, `recordedAt`, `summary` and `gates`
- And `status` is `PASS` or `FAIL`, and `scope` is `prototyping`, `atdd` or `full`
- And no field named `outcome` or `testObservation` is written, and neither `accepted_with_debt` nor any other stage-result value appears as a value in the file

## EX-0014-0034

- BR-Ref: BR-0014-0030
- Given the final gates report three findings verify did not cause: a business rule with no example (a spec gap), an E2E test that asserts on the wrong page (an acceptance-test defect), and a unit test failing on production code (an implementation defect)
- When the verify stage returns
- Then the outcome is `needs_repair`, and `debts` lists the three findings with the resolving owners `qfai-sdd`, `qfai-atdd` and `qfai-implement`
- And verify changes no spec, test or production file to clear any of them

## EX-0014-0035

- BR-Ref: BR-0014-0031
- Given workflow mode `active` and a work order for stage instance `verify-1` and operation `verify-full`
- When `/qfai-verify` receives it and the run, stage instance and work-order IDs all match the issued order
- Then it runs the final gates for that work order only, and says nothing to the operator
- And when it is selected in the same mode with no work order and not by name, it edits nothing and passes the request to `qfai-run`
- And `qfai-verify/SKILL.md` holds exactly one line citing `references/orchestrated-mode.md`

## EX-0014-0036

- BR-Ref: BR-0014-0032
- Given `qfai-verify/references/orchestrated-mode.md`
- When the first table under its `## Operations` heading is read
- Then the `Operation` column holds exactly `verify-full`, in one backticked cell, and no other operation

## EX-0014-0037

- BR-Ref: BR-0014-0033
- Given a verify stage whose required E2E gate cannot start because its database container is absent
- When the verify stage returns
- Then the outcome is `blocked`, with the blocker `stage-blocked` and `operator` as the one who clears it
- And `debts` holds no entry for the missing environment, and no repair is routed for it
