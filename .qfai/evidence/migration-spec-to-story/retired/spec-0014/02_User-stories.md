# 02 User Stories

## US Catalog

- US-0014-0013: verify to use the canonical validator path
- US-0014-0014: truthful evidence and placeholder rejection to remain enforced
- US-0014-0018: verify to depend on contract-first validate gates rather than implicit discussion-pack runners
- US-0014-0019: legacy compatibility namespaces to remain removed
- US-0014-0020: `qfai prototyping certify --scope saas-package` to seal a `completion-certificate.json` that explicitly carrie…

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
