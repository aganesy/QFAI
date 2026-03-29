# 99_delta

## Change Log

| Date       | Change Type | Description                        | Affected Files |
| ---------- | ----------- | ---------------------------------- | -------------- |
| 2026-03-29 | Initial     | Discussion pack initial creation   | All 15 files   |

## Adopted Decisions

| Decision                                          | Rationale                                                                   | References       |
| ------------------------------------------------- | --------------------------------------------------------------------------- | ---------------- |
| Premium path as explicit non-default mode          | Cost/complexity inappropriate for standard users; opt-in preserves simplicity | TC-004, REQ-0011 |
| Fail-open semantics for critique adapter           | Prevents single provider failure from halting harness; tight failure boundary | OQ-0006, POL-002 |
| Heuristic-based display/stub detection             | Sufficient accuracy without AST parser dependency overhead                   | OQ-0007, REQ-0020 |

## Rejected Options --- Recurrence Prevention

| OQ-ID   | Rejected Option                                   | Reason                                                          | Recurrence Note                                                                  |
| ------- | ------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| OQ-0001 | (A) 10 iterations / (C) 20 iterations             | 10 too few to converge; 20 has diminishing returns vs cost      | Default must balance quality convergence with cost; 15 is the calibrated default |
| OQ-0002 | (B) Consecutive count / (C) Combined              | Binary count loses granularity; combined adds unnecessary complexity | Plateau detection should use measurable score deltas, not binary signals        |
| OQ-0006 | (B) Full-harness fail-open / (C) Per-component    | Too broad masks structural failures; per-component over-engineers | Fail-open boundary must be at adapter level to prevent cascade                   |
| OQ-0007 | (B) AST-based / (C) Hybrid                        | AST adds heavy dependency disproportionate to benefit            | Prefer heuristic first; upgrade to hybrid only if false-positive data warrants   |
| ---     | Making full-harness the default prototyping path   | Cost and complexity inappropriate for standard prototyping users | Full-harness must remain explicitly opted into; never promote to default          |
| ---     | Critique semantics in validate command             | Would pollute deterministic validation with non-deterministic critique | Validate must stay deterministic; critique belongs in separate adapter path     |

## Drift Events

(None - initial discussion)
