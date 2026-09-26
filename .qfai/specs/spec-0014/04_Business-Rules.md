# 04 Business Rules

## BR-0014-0001

- AC-Refs: AC-0014-0001
- Verify is always full-scan.

## BR-0014-0002

- AC-Refs: AC-0014-0002
- Reviewer PASS/REVISE is part of the completion gate.

## BR-0014-0003

- AC-Refs: AC-0014-0003
- Validate remains the source of deterministic schema/evidence findings.

## BR-0014-0004

- AC-Refs: AC-0014-0004
- Legacy validator slices may still refer to `full-harness` artifact semantics if corresponding code remains.
- Such wording must not be interpreted as restoring a removed runtime or CLI entrypoint.

## BR-0014-0005

- AC-Refs: AC-0014-0005
- Verify treats `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` as the active evidence layout; legacy `screenshots/` / `html/` paths MUST not be required.

## BR-0014-0006

- AC-Refs: AC-0014-0006
- `prototyping iterate` cycle 0 MUST delete any legacy `fullHarness` block from the live `prototyping.json` as part of the hard reset, so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state from a prior pre-1.8.9 session.

## BR-0014-0025

- AC-Refs: AC-0014-0022
- `qfai prototyping certify --scope saas-package` MUST seal `completion-certificate.json` with `scope: "saas-package"` and a non-empty `notes:` field naming every skipped gate (the ATDD / implement-class gates skipped by the SaaS-package validate profile, REQ-0166 validate side in spec-0004).
- The SaaS-package certificate MUST NOT claim full DONE; any field that would assert full completion MUST be withheld or set to the `saas-package` scope value.
- `--upgrade-scope full` MUST be rejected while any gate named in `notes:` is still missing, and MUST be permitted to upgrade the sealed certificate to full scope only after every previously-skipped gate PASSes.
- This `--scope saas-package` delivery mode MUST be documented in `/qfai-prototyping` SKILL.md as a SaaS-tenant delivery mode (DCON-005 design-system attestation reference; one-minor deprecation window per OC-63).

## BR-0014-0026

- AC-Refs: AC-0014-0023
- The verify stage result names the `verify.json` the stage wrote in its artifact references and the qa-gatekeeper verdict as a review result, and reports its own gate results as information only.

## BR-0014-0027

- AC-Refs: AC-0014-0024
- The verify stage never names a `verify.json` from another run, another spec or a shared location as its own report.

## BR-0014-0028

- AC-Refs: AC-0014-0025
- The verify stage result reports its outcome and its test observation apart, and reports a gate that did not run as `unrun`, never as a pass.

## BR-0014-0029

- AC-Refs: AC-0014-0026
- `verify.json` gains no field inside a run, and its `status` and `scope` keep the closed value sets `qfai-verify/references/verify-output-contract.md` states.
- No `outcome` or `testObservation` value is written into it. The run's values belong to the stage result, which names the file instead. The file already has two readers, `certify` and the reviewer-gate check, and a run gives neither of them a new value to handle.

## BR-0014-0030

- AC-Refs: AC-0014-0027
- Verify repairs no artifact another owner holds. For a finding it did not cause, it returns `needs_repair` and lists the finding in `debts` with its `resolvingOwner`, so the run sends the repair there.
- The owner follows from the kind of finding, and the repair kinds are a closed set of three: a spec gap goes to `qfai-sdd`, an acceptance-test defect to `qfai-atdd`, and an implementation defect to `qfai-implement`. A missing environment is not a repair kind (BR-0014-0033).

## BR-0014-0031

- AC-Refs: AC-0014-0028
- In mode `active`, `/qfai-verify` makes the stage-skill entry check, does only the work of a work order it is handed, and its `SKILL.md` cites `references/orchestrated-mode.md` with one line.

## BR-0014-0032

- AC-Refs: AC-0014-0029
- The `## Operations` table of `qfai-verify/references/orchestrated-mode.md` lists exactly the operation the plan vocabulary assigns to `qfai-verify`.

## BR-0014-0033

- AC-Refs: AC-0014-0027
- When a gate cannot run because its environment is missing, the verify stage returns `blocked` with the blocker `stage-blocked` and `operator` as the one who clears it, and lists no debt for it.

## Contract Realization

The CLI contracts declare no `CON-*` ID, so this table names the contract section
that realizes each rule added on 2026-09-24.

| Contract   | Section                                            | Realized by                              |
| ---------- | -------------------------------------------------- | ---------------------------------------- |
| CLI-WF     | `## Completion`                                    | BR-0014-0026                             |
| CLI-WF     | `## Fingerprints and receipts`                     | BR-0014-0026, BR-0014-0027               |
| CLI-WF     | `### Stage result`                                 | BR-0014-0028, BR-0014-0030, BR-0014-0033 |
| CLI-WF     | `## State machine` (the blocker and who clears it) | BR-0014-0033                             |
| CLI-WF     | `### host:stage-skill-handover`                    | BR-0014-0031                             |
| CLI-WFFILE | `### The Operations table`, `### Vocabulary`       | BR-0014-0032                             |

BR-0014-0029 has no row here: the shape of `verify.json` is
`qfai-verify/references/verify-output-contract.md`'s. In BR-0014-0030 the
contract carries the field, its domain and the routing; the three repair kinds and their
owners are a spec rule.
