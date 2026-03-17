# Policy

## Version Policy

| ID       | Policy                                    | Rationale                                                       |
| -------- | ----------------------------------------- | --------------------------------------------------------------- |
| POL-V001 | 1 version = 1 PR                          | Atomic traceability; each release is a single reviewable unit   |
| POL-V002 | Scope limited to guardrail hardening only | No feature creep; v1.6.1 addresses only Phase 2 validation gaps |

## Quality Policy

| ID       | Policy                                                                  | Rationale                                                                |
| -------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| POL-Q001 | All Phase 2 checks are error severity (completion fraud prevention)     | Phase 2 violations directly enable completion fraud; warning is too weak |
| POL-Q002 | No false negatives allowed (missed violations are bugs)                 | A missed violation defeats the purpose of the guardrail                  |
| POL-Q003 | False positives must be minimized but are preferable to false negatives | User inconvenience is recoverable; missed fraud is not                   |

## Migration Policy

| ID       | Policy                                                                                           | Rationale                                                                     |
| -------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| POL-M001 | Existing specs without test-list.md receive TDDLIST_MISSING as warning                           | Graceful adoption; specs created before v1.6.0 are not penalized              |
| POL-M002 | Specs with test-list.md but old 6-column format receive TDDLIST_REQUIRED_COLUMN_MISSING as error | Once a spec opts in to test-list.md, it must meet current schema              |
| POL-M003 | Users must manually add DR-ID and Evidence columns when upgrading from v1.6.0                    | Automated migration risks data loss; explicit user action ensures correctness |
