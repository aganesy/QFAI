# Policy

## Security Policy

| ID          | Policy                                 | Rationale                                                                      |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| POL-SEC-001 | No secrets in skill bodies or wrappers | Skill and wrapper files are committed to version control and publicly readable |

## Compliance Policy

| ID           | Policy                                     | Rationale                                                    |
| ------------ | ------------------------------------------ | ------------------------------------------------------------ |
| POL-COMP-001 | MIT license compliance for all new content | Repository is MIT-licensed; all additions must be compatible |

## Quality Policy

| ID         | Policy                                                 | Rationale                                                                   |
| ---------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| POL-QA-001 | All changes must have corresponding test coverage      | Untested changes are unverifiable; test coverage is mandatory for hardening |
| POL-QA-002 | Required/forbidden phrase guardrails must be automated | Manual phrase checks degrade over time; CI-enforced guardrails are durable  |

## Process Policy

| ID           | Policy                                     | Rationale                                                                  |
| ------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| POL-PROC-001 | 1 version = 1 PR policy must be maintained | Atomic traceability; each release converges in one reviewable pull request |
