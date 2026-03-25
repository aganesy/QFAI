# 10 Policy

Discussion pack: discussion-20260325120000000
Version context: QFAI v1.7.0 "Discussion Design Hardening"
Last updated: 2026-03-25

---

## Security Policy

Security policy is not directly applicable to v1.7.0. This release introduces no authentication mechanisms, no data storage changes, no network calls, and no processing of personal or sensitive data. QFAI operates as a local CLI tool that reads and validates markdown-based discussion pack files. The attack surface introduced by v1.7.0 is limited to the parsing of those files, which is already covered by existing input handling practices.

If a future release introduces network access or data persistence, a dedicated security policy section must be authored at that time.

---

## Compliance Policy

Compliance policy is not directly applicable to v1.7.0. No regulatory frameworks (GDPR, HIPAA, SOC 2, etc.) impose requirements on this release. QFAI is an open-source developer tooling package with no end-user data handling.

---

## Development Policy

### Branching

All v1.7.0 development work must occur on the `feature/v1.7.0` branch, created from `main` at the start of the release cycle. No direct commits to `main` are permitted for this release. The branch must remain open until all acceptance criteria are met, at which point a single pull request is opened per OC-1.

Sub-feature branches (e.g., `feature/v1.7.0-dds-validator`, `feature/v1.7.0-artifact-detection`) are permitted as working branches merged into `feature/v1.7.0`, provided they do not bypass the single-PR-to-main constraint.

### Code Review

All changes merged into `main` via the v1.7.0 PR require standard pull request review. Review criteria include:

- Correctness of UI-bearing detection logic against TC-2.
- Validator integration compliance with TC-3.
- Absence of new runtime dependencies per TC-5.
- Presence of tests, verify-pack updates, and documentation per OC-2.
- TypeScript 5.6.3 compatibility per TC-4.
- No new top-level CLI commands per OC-3.

At least one reviewer familiar with the existing validator architecture must approve the PR before merge.

### Testing

All new validators introduced in v1.7.0 must be covered by vitest unit tests. The following testing requirements apply:

- **Unit tests**: Each new validator function must have dedicated unit tests covering the passing case, the failing case, and any edge cases specific to UI-bearing pack detection (e.g., pack with UI artifacts but missing DDS, pack without UI artifacts that should not trigger DDS checks).
- **Integration tests**: The full discussion pack validation flow must be exercised with at least one UI-bearing fixture pack and one non-UI-bearing fixture pack to verify that backward compatibility (TC-1) holds and that new validators activate correctly.
- **Regression tests**: Existing test fixtures from v1.6.5 must continue to pass without modification.
- **Test location**: All new test files must follow the existing test directory conventions of the repository.
- **Coverage**: New validator logic paths must achieve the same coverage standard applied to existing validators in the project.

---

## Operational Policy

### Deployment

v1.7.0 is released via `npm publish` following the merge of the single v1.7.0 PR to `main`. The version number in `package.json` must be bumped to `1.7.0` as part of the PR. The changelog must be updated in the same changeset. No manual post-merge steps beyond `npm publish` are required.

### Error Severity

New structural checks introduced in v1.7.0 — specifically those that enforce the presence and completeness of the DDS section in UI-bearing packs — are assigned `error` severity by default. This means:

- A UI-bearing pack missing a DDS section entirely produces a blocking error, not a warning.
- A UI-bearing pack with an incomplete DDS (e.g., missing CTA hierarchy, missing state coverage, missing design anti-goals, missing option comparison outcome, missing selected anchor screen) produces a blocking error for each absent sub-element.
- `warning` severity is reserved for heuristic quality checks (e.g., anti-goals list is unusually short) where absence of content is ambiguous rather than definitively incorrect.
- The severity assignment must be consistent regardless of the quality profile setting on the pack. The quality profile infrastructure (standard/high/strict) is preserved but does not gate or downgrade DDS structural errors.

### Rollback Strategy

If a post-publish defect is discovered in v1.7.0:

1. **Severity assessment**: Determine if the defect breaks existing (non-UI) packs (critical) or only affects new UI-bearing features (non-critical).
2. **Critical defect (breaks backward compatibility)**: Publish a patch release (v1.7.1-hotfix or npm deprecation + v1.6.6 patch) within 24 hours. The patch must disable the faulty validator check while preserving all other v1.7.0 functionality.
3. **Non-critical defect (UI-bearing feature only)**: Fix in a follow-up patch (v1.7.0-patch) without urgency. The defect does not affect non-UI packs, so no emergency rollback is needed.
4. **npm unpublish**: As a last resort for critical regression within the first 72 hours, `npm unpublish qfai@1.7.0` may be used. This is destructive and requires explicit maintainer approval.

### Pre-Publish Validation Gate

Before `npm publish`, the following must pass:

1. `pnpm test` — all unit and integration tests pass (exit code 0)
2. `pnpm build` — TypeScript compilation succeeds with no errors
3. `qfai validate --fail-on error` — self-validation of the QFAI repository's own discussion/spec packs passes
4. Manual smoke test: run `qfai validate` against a known v1.6.5 non-UI fixture pack to confirm backward compatibility (TC-1)
5. Version number in `package.json` matches the intended release (1.7.0)

No publish may proceed if any of these gates fail.

### Single-PR Contingency

If a blocking component failure occurs near the release date and threatens the single-PR constraint (OC-1):

1. The blocking component may be temporarily disabled via a feature flag or code exclusion within the same PR, with a follow-up issue filed for re-enablement.
2. The PR scope may be reduced by moving the blocked feature to v1.7.0-patch, provided core backward compatibility and at least one new structural validator are shipped.
3. Splitting into multiple PRs is the last resort and requires explicit agreement that the version boundary should be reconsidered.

### Quality Profile Infrastructure

The existing quality profile infrastructure (standard/high/strict) is preserved in v1.7.0 without modification to its semantics or configuration interface. v1.7.0 does not introduce new profile tiers and does not change how profiles are selected or applied. New DDS structural validators are applied at all profile levels with `error` severity. Profile-sensitive behavior for new validators (e.g., stricter heuristic checks at `strict` profile) is deferred to a future release.
