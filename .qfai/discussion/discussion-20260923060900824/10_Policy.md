# 10 Policy

## Security Policy

- Authentication: not applicable. The CLI runs locally and has no accounts.
- Authorization: not applicable.
- Data protection: an adopter's files under `.qfai/steering/` are never deleted,
  moved or rewritten (REQ-0010, NFR-0003). An edited copy of the withdrawn schema
  is kept (REQ-0006).
- Secret management: not applicable. The change reads and writes no secret.

## Compliance Policy

- Applicable standards:
  - `.agents/rules/distributed-surface.md` for shipped text (NFR-0004).
  - `.agents/rules/repository-language.md`: repository text is English, and
    `## [Unreleased]` in `CHANGELOG.md` holds no Japanese.
  - `.agents/rules/documentation-clarity.md` for skill text, README and CHANGELOG
    (NFR-0007).
  - `.agents/rules/shipped-ci-parity.md` applies only if the change touches
    `.github/workflows/**`, `.github/actions/**`, `scripts/run-lint-checks.sh` or a
    `ci:*` entry. The dogfood re-pin edits `scripts/dogfood-backlog.json`, which
    the rule does not watch.
- Audit requirements: every removed obligation is traced through the Change
  Request `/qfai-sdd` raises (REQ-0016), and removed TDD-IDs are tombstoned.
- Data retention: this repository keeps the unique content of its seven entries
  in tracked evidence files (REQ-0013). The git history keeps the entries
  themselves.

## Development Policy

- Branching strategy: work on a branch off `main`. The version is set only on
  the user's instruction (OC-2).
- Code review requirements: `REVIEW.md`; every finding as an inline pull request
  comment.
- Testing requirements: `CLAUDE.md` `## Project Rules` asks that every source
  change has test coverage. For a change that only deletes, that is met as
  follows (REQ-0017):
  - The tests that fixed the removed behaviour are deleted with it.
  - The type check fails on any import of a deleted module.
  - The behaviour that remains keeps its existing tests. The change adds no test
    beyond `spec-0004/TDD-0072`, which tests the kept `R-REJECTED-READOPT` rule.
  - No test asserts that the deleted surface is absent. Such a test covers no
    behaviour the product has.

## Operational Policy

- Deployment strategy: the npm release the user names (OQ-0011). No separate
  migration step for adopters (DTC-5).
- Monitoring requirements: CI, including the dogfood ratchet (NFR-0005).
- Incident response: an adopter who relied on the removed findings reads the
  CHANGELOG entry (REQ-0011). Their files are intact, so nothing needs restoring.
