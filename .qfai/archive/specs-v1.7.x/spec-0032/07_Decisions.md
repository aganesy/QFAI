# 07 Decisions

## Decisions

| DEC-ID        | Title                   | Adopted Option                                             | Source    | Rationale                                                                                                                                                              |
| ------------- | ----------------------- | ---------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-0032-0001 | Metrics serialization   | JSON Lines (one JSON object per line)                      | spec-0032 | JSON Lines supports streaming append and line-by-line parsing, aligning with iteration-level emission and local buffer file append semantics                           |
| DEC-0032-0002 | Drift threshold default | 0.15 (15% normalized divergence), configurable per project | spec-0032 | 15% balances sensitivity (catching meaningful drift) against noise (ignoring run-to-run variance). Configurability via qfai.config.yaml allows project-specific tuning |

## Rejected Options

| DEC-ID        | Rejected Option                         | Reason                                                                                                 |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| DEC-0032-0001 | Structured JSON array per run           | Array requires buffering entire run before writing; incompatible with streaming/per-iteration emission |
| DEC-0032-0001 | CSV format                              | CSV lacks nested structure for model metadata and iteration references                                 |
| DEC-0032-0002 | Fixed threshold (non-configurable)      | Projects vary in acceptable drift; a fixed threshold causes false positives or misses                  |
| DEC-0032-0002 | Statistical significance test (p-value) | Requires minimum sample size of runs; impractical for early-stage projects with few runs               |
