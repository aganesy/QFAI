# 07 Decisions

## Decisions

| DEC-ID      | Title                                     | Adopted Option                                                       | Source       | Rationale                                                                                                                                                                                                      |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-0033-001 | Heuristic-based detection (not AST)       | Heuristic pattern matching for stub/display detection                | DR-0076      | AST parsing adds heavyweight dependency and language-specific complexity; heuristic approach is portable, fast, and sufficient for >90% of cases. Extensible pattern list allows tuning without parser changes |
| SD-0033-002 | Portable handoff artifacts (no user lock) | User-agnostic artifacts with relative paths and credential stripping | TC-62, TC-64 | Handoff artifacts must be resumable by any team member or CI runner; user-locked artifacts would break NFR-0007 resumability guarantee in team and automation scenarios                                        |

## Rejected Options

| DEC-ID      | Rejected Option                                 | Reason                                                                           |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| SD-0033-001 | AST-based detection per language                | Heavyweight dependency; requires per-language parser; not portable across stacks |
| SD-0033-001 | LLM-based detection                             | Non-deterministic; violates idempotency requirement (AC-0010); latency concern   |
| SD-0033-002 | User-locked artifacts with credential embedding | Breaks portability (AC-0005); violates POL-003 credential stripping policy       |
| SD-0033-002 | Artifact encryption with user-specific key      | Adds key management complexity; prevents CI/automation resumption                |
