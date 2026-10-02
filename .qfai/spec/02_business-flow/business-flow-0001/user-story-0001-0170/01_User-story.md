# US-0001-0170: Envelope-deviation `AskUserQuestion` audit-log

## User Story

As a QFAI maintainer, I want the skill body to write an envelope-deviation decision record to `.qfai/evidence/decision/<ISO8601-ts>.json` whenever an `AskUserQuestion` names one of the four envelope-deviation contexts (skill-envelope / architectural-decision / rejected-option re-adoption / scope-expansion), so that future reviewers can map a deviation back to the architectural envelope-contract clause it touched.
