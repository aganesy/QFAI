# US-0001-0160: Scoped SaaS package certificate

## User Story

As a delivery lead shipping a SaaS-tenant project, I want `qfai prototyping certify --scope saas-package` to seal a `completion-certificate.json` that explicitly carries `scope: "saas-package"` and a `notes:` field naming every skipped gate, so that the certificate never overstates completion as full DONE and an `--upgrade-scope full` path exists once the missing gates land.
