# 02 User Stories

## US Catalog

- US-0014-0013: verify to use the canonical validator path
- US-0014-0014: truthful evidence and placeholder rejection to remain enforced
- US-0014-0018: verify to depend on contract-first validate gates rather than implicit discussion-pack runners
- US-0014-0019: legacy compatibility namespaces to remain removed
- US-0014-0020: `qfai prototyping certify --scope saas-package` to seal a `completion-certificate.json` that explicitly carrie…
- US-0014-0021: Verify as the final stage of a run

## US-0014-0013

As a maintainer, I want verify to use the canonical validator path, so that removed compatibility surfaces do not re-enter production.

## US-0014-0014

As a reviewer, I want truthful evidence and placeholder rejection to remain enforced, so that evidence summaries are trustworthy.

## US-0014-0018

As a maintainer, I want verify to depend on contract-first validate gates rather than implicit discussion-pack runners, so that downstream completion reflects the current execution architecture.

## US-0014-0019

As a maintainer, I want legacy compatibility namespaces to remain removed, so that verify guidance matches the actual package surface.

## US-0014-0020

As a delivery lead shipping a SaaS-tenant project, I want `qfai prototyping certify --scope saas-package` to seal a `completion-certificate.json` that explicitly carries `scope: "saas-package"` and a `notes:` field naming every skipped gate, so that the certificate never overstates completion as full DONE and an `--upgrade-scope full` path exists once the missing gates land.

## US-0014-0021: Verify as the final stage of a run

- Parent: CAP-0014
- Source: discussion-20260923171450572#DUS-001
- Goal: As an operator who asked for a feature once, I want `/qfai-verify` to run
  the final gates as a stage of the run and send each finding to the stage that
  owns it, so that completion rests on this run's own verdict and no stage patches
  what another stage owns.
- Non-goals: deciding whether the run is complete, which `finish` does; copying
  the report under the run; repairing a spec, a test or production code.
- Notes: the verify side of the pack story. `verify.json` keeps its path, fields
  and values.
