# Constraints

## Technical Constraints

| ID       | Constraint                                                                     | Rationale                                                 |
| -------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| CON-T001 | Must extend existing tddList.ts validator (not rewrite)                        | Preserve Phase 1 stability; incremental hardening only    |
| CON-T002 | Must maintain Phase 1 error codes unchanged                                    | Backward compatibility for existing CI integrations       |
| CON-T003 | Test file existence check uses Node.js fs.access (no shell commands)           | Cross-platform portability; no child_process dependency   |
| CON-T004 | Path resolution must handle Windows backslash normalization                    | QFAI runs on Windows and Unix; paths must be OS-agnostic  |
| CON-T005 | Must work with existing parseFirstMarkdownTable and parseTestCaseIds utilities | Reuse proven parsing logic; avoid duplicate table parsers |

## Operational Constraints

| ID       | Constraint                                                                                                           | Rationale                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| CON-O001 | Single PR for all v1.6.1 changes                                                                                     | 1 version = 1 PR policy (POL-V001)                        |
| CON-O002 | Must preserve the existing CI contract of `qfai validate --fail-on error` (flag, exit semantics, invocation pattern) | Production stability; no CI contract surprises on upgrade |
| CON-O003 | Existing specs without test-list.md continue to get warning only                                                     | Graceful migration path; existing specs are not broken    |

## Budget / Timeline

| ID       | Constraint                                                     | Rationale                                                        |
| -------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| CON-B001 | v1.6.1 is the immediate next release after v1.6.0 (2026-03-17) | Guardrail hardening is highest priority; no intervening releases |
