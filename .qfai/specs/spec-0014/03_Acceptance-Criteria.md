# 03 Acceptance Criteria

## AC-0014-0001

- `/qfai-verify` runs full-scan validation rather than a diff-only shortcut.

## AC-0014-0002

- Verify inspects reviewer artifacts and blocks on `REVISE`.

## AC-0014-0003

- Validate imports and uses the canonical validator entrypoint.
- Removed compatibility surfaces are not present in the package surface.

## AC-0014-0004

- Design-system related validators continue to run when their prerequisite files/artifacts exist.
- Legacy `full-harness` wording inside validator slices is treated as artifact vocabulary, not as a public command contract.

## AC-0014-0005: Prototyping Evidence Path Layout

- Given a `/qfai-verify` run on a UI-bearing repo,
- When prototyping evidence is inspected,
- Then the active layout is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` per iter; the legacy `screenshots/` / `html/` directory layout is no longer accepted as the active SSOT.

## AC-0014-0006: Full-Harness Block Drop on Cycle 0

- Given a `prototyping.json` that carries a legacy `fullHarness` block from a prior pre-1.8.9 run,
- When `prototyping iterate` runs cycle 0,
- Then the cycle-0 hard reset removes the `fullHarness` block from the live `prototyping.json` so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state.

## AC-0014-0022: SaaS-Package Certify Scope Seal

- Given a UI-bearing SaaS-tenant project whose prototyping evidence is complete but whose ATDD / implement-class gates were intentionally skipped,
- When `qfai prototyping certify --scope saas-package` is run,
- Then the sealed `completion-certificate.json` MUST carry `scope: "saas-package"` and a non-empty `notes:` field that names each skipped gate, MUST NOT claim full DONE, and `--upgrade-scope full` MUST be rejected until the missing gates land — at which point it may upgrade the existing certificate to full scope.

## AC-0014-0023: The stage result names this run's verify.json and its independent review

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0023
# Source: discussion-20260923171450572#DAC-001-04
Scenario: The stage result names this run's verify.json and its independent review
  Given an orchestrated verify work order
  When the verify stage returns
  Then its artifact references name the verify.json this stage wrote
  And the qa-gatekeeper verdict is a review result from a reviewer independent of the authors
  And its own gate results are reported as information, never as the gate decision
```

## AC-0014-0024: A report from elsewhere is never offered as this run's

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0024
# Source: discussion-20260923171450572#REQ-0063
Scenario: A report from elsewhere is never offered as this run's
  Given a verify.json written by another run, for another spec, or kept in a shared location
  When the verify stage returns
  Then that file is not named as this stage's report
```

## AC-0014-0025: Validation that did not run is reported unrun

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0025
# Source: discussion-20260923171450572#REQ-0035
Scenario: Validation that did not run is reported unrun
  Given a verify stage in which a required gate did not run
  When the stage returns
  Then its outcome and its test observation are reported apart
  And the gate that did not run is unrun, never a pass
```

## AC-0014-0026: verify.json keeps its fields and values

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0026
# Source: discussion-20260923171450572#REQ-0035
Scenario: verify.json keeps its fields and values
  Given the verify stage of a run
  When it writes verify.json
  Then the file carries no field it did not carry before
  And its status and scope take only the values they took before
  And no stage outcome or test observation value is written into it
```

## AC-0014-0027: Verify sends each finding to its owner

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0027
# Source: discussion-20260923171450572#REQ-0039
Scenario: Verify sends each finding to its owner
  Given the final gates report findings verify did not cause
  When the verify stage returns
  Then a spec gap, an acceptance-test defect and an implementation defect are listed as needs_repair findings, with qfai-sdd, qfai-atdd and qfai-implement as their resolving owners
  And a missing environment returns the stage blocked, with the blocker stage-blocked and the operator as the one who clears it
  And verify edits no artifact another owner holds
```

## AC-0014-0028: The verify stage follows the stage-skill handover

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0028
# Source: discussion-20260923171450572#REQ-0051
Scenario: The verify stage follows the stage-skill handover
  Given workflow mode active
  When /qfai-verify is selected with no work order and not by name
  Then it edits nothing and passes the request to qfai-run
  And a worker handed a work order checks the run, stage and work-order IDs and does only that work
  And SKILL.md cites references/orchestrated-mode.md with one line
```

## AC-0014-0029: The Operations table lists what the plan vocabulary assigns to qfai-verify

- US-Refs: US-0014-0021

```gherkin
# AC-0014-0029
# Source: discussion-20260923171450572#REQ-0052
Scenario: The Operations table lists what the plan vocabulary assigns to qfai-verify
  Given the qfai-verify reference references/orchestrated-mode.md
  When its Operations table is read
  Then it lists exactly the operation the plan vocabulary assigns to qfai-verify
```
