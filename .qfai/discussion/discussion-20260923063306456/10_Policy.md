# 10 Policy

## Security Policy

- Authentication: not applicable. The change adds no service and no login.
- Authorization: the migration scripts write only to `.qfai/`, `qfai.config.yaml`, the managed `.gitignore` block, the host integration links and `QFAI:` annotation lines in test files (NFR-0008). Which skill may write which layer follows the skill ownership in REQ-0015: `/qfai-atdd` writes BF and AC tests, `/qfai-implement` writes EX tests.
- Data protection: the scripts read and write the adopter's own repository files and send nothing anywhere (NFR-0008).
- Secret management: not applicable. No step reads or stores a credential.

## Compliance Policy

- Applicable standards: the package stays MIT-licensed (`packages/qfai/package.json#license`).
- Audit requirements: every decision, change request and test exception is a `decisions.md` row whose Status is the only field that changes (REQ-0011). Git history is the record of when and by whom; the tables carry no date or approver (Q6).
- Data retention: decisions are never deleted; a replaced decision is marked SUPERSEDED and a withdrawn one REJECTED (REQ-0011). Whether and how `decisions.md` is split or archived as it grows is deferred (OQ-0025).

## Development Policy

- Branching strategy: a pinned integration branch under `.agents/rules/version-discipline.local.md` (SRC-0117). Its name and version are the user's decision (OQ-0022).
- Code review requirements: `REVIEW.md` and the routed reviewers in `.qfai/assistant/manifest/review-profiles.yml`. Every finding is posted inline.
- Testing requirements:
  - Every source change has test coverage (`CLAUDE.md#Project Rules`).
  - One validator fixture per coverage rule (DSC-002).
  - One old-layout migration fixture, used for NFR-0001 to NFR-0003.
  - The distributed-surface guards pass on every change (NFR-0004).

## Operational Policy

- Deployment strategy: one breaking major release. P1 to P7 land on the pinned integration branch, and no release carries P2 to P6 output before the P7 cutover. The old layout is an error from that release on; there is no release that accepts both (Q12).
- Monitoring requirements: not applicable to a package release beyond CI.
- Incident response: an adopter whose migration fails reruns the dry run and reads the migration report; a case the scripts could not convert is listed there for a person to resolve (REQ-0020). A defect in the scripts is fixed in a patch release.
