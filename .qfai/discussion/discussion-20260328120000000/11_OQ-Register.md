# 11 OQ Register

## Open Questions

| OQ-ID   | Title                                               | Gate       | Disposition | Owner | Rationale                                                                                                                  | Options                                                                                                                                                                  | Recommendation                          | Next-Decision-Point         | Due    | Evidence                   |
| ------- | --------------------------------------------------- | ---------- | ----------- | ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------- | ------ | -------------------------- |
| OQ-0001 | Sidecar default examples verbosity level            | discussion | resolved    | agent | Minimal-but-complete approach balances authoring friction vs downstream readability                                        | Option A: Verbose (full examples per artifact) / Option B: Minimal-but-complete (one example per artifact type) (recommended: B) / Option C: Skeleton-only (no examples) | Option B: Minimal-but-complete          | N/A                         | v1.7.3 | Design spec §2.1, NFR-0003 |
| OQ-0002 | Non-UI but interaction-heavy project classification | discussion | resolved    | agent | Classification based on surface type, not interaction complexity; interaction-heavy CLI/API projects remain non-UI-bearing | Option A: Classify by interaction complexity / Option B: Classify by surface type only (recommended: B) / Option C: Hybrid classification                                | Option B: Classify by surface type only | N/A                         | v1.7.3 | Design spec §2.2, SRC-0001 |
| OQ-0003 | Screen contracts vs existing contracts/ui bridging  | sdd        | deferred    | agent | Bridging details require SDD-phase analysis of CON-UI-\* schema; premature to decide in discussion                         | Option A: Screen contracts replace CON-UI / Option B: Screen contracts reference CON-UI via ID (recommended: B) / Option C: Independent schemas                          | Option B: Reference via ID              | SDD phase start             | v1.7.4 | Design spec §9             |
| OQ-0004 | Reviewer output schema final form                   | sdd        | deferred    | agent | Reviewer implementation is v1.7.4 scope; schema depends on validator design                                                | Option A: JSON schema / Option B: YAML schema (recommended: A) / Option C: Markdown structured                                                                           | Option A: JSON schema                   | v1.7.4 implementation start | v1.7.4 | Design spec §2.3, §9       |

## Rules

- Every OQ must have a unique `OQ-ID` with zero-padded 4-digit suffix.
- Valid dispositions: `resolved`, `deferred`. No `open` items may remain at gate exit.
- `resolved` items require `Rationale` and `Recommendation` filled.
- `deferred` items require `Next-Decision-Point` and `Due` filled.
- Gate indicates the phase where the OQ was raised (`discussion`, `sdd`, `implementation`).
- OQ register exit condition: **open count = 0**.
