# 10 Policy

## Security Policy

- Authentication: Not applicable (CLI tool, no auth layer)
- Authorization: Not applicable
- Data protection: No user data processed; credential patterns in validation must not expose sensitive values
- Secret management: Credential key pattern handling must follow existing narrow ENOENT catch pattern (ref: v1.7.6 fix)

## Compliance Policy

- Applicable standards: None identified beyond internal QFAI conventions
- Audit requirements: Each release must pass qfai validate --fail-on error
- Data retention: Evidence files follow .qfai/evidence/ gitignore policy

## Development Policy

- Branching strategy: Feature branches (feature/v1.7.x) merged to main via PR
- Code review requirements: All changes require PR review per REVIEW.md policy
- Testing requirements: All source changes must have corresponding test coverage (CLAUDE.md rule)
- Type safety: Avoid bare `as` type assertions; prefer type narrowing (CLAUDE.md rule)
- Error handling: Every async path must have explicit error handling (CLAUDE.md rule)
- Function size: Extract when exceeding ~50 lines (CLAUDE.md rule)

## Operational Policy

- Deployment strategy: npm publish to registry after validation passes
- Monitoring requirements: Not applicable for CLI tool
- Incident response: Issues tracked via GitHub Issues; P0 fixes prioritized as hotfixes
