# 10 Policy

## Quality Policies

- QP-01: All init assets must pass `qfai validate --fail-on error` before release.
- QP-02: Sidecar artifact schemas must include version fields for future migration.
- QP-03: Template changes must be tested with both UI-bearing and non-UI sample projects.

## Security Policies

- SP-01: No credentials, tokens, or secrets in template content or examples.
- SP-02: Template defaults must not reference external URLs or services.

## Compatibility Policies

- CP-01: Existing non-UI discussion packs must continue to validate without modification.
- CP-02: HTML/CSS mock remains available as fallback; not deleted.
- CP-03: Sidecar generation is opt-in (triggered by UI-bearing classification).

## Documentation Policies

- DP-01: SKILL.md must clearly distinguish UI-bearing and non-UI authoring paths.
- DP-02: Each sidecar artifact must include inline documentation (YAML comments or markdown headers).
- DP-03: CHANGELOG entry required for v1.7.3 release.

## Versioning Policies

- VP-01: Sidecar schemas start at version 0.1 (pre-stable).
- VP-02: Breaking schema changes require major version bump in sidecar schema version field.
