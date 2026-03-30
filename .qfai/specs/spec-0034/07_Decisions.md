# 07 Decisions

## Decisions

3 items referenced from \_policies/08_Decisions.md (pending registration).

| DEC-ID      | Title                                        | Adopted Option                                                                              | Source                    | Rationale                                                                                                                                               |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-0034-001 | 3-layer migration window policy              | v1.7.8 warning for 4-axis format; v1.8.0 promotes to error. Mixed format always error       | DR-0087 (pending), AD-003 | Breaking existing adopters without migration window violates NFR-0001. Warning provides upgrade guidance while convergence proceeds                     |
| SD-0034-002 | Weak strategy deprecation path               | v1.7.8 warning for weak schema; v1.8.0 promotes to error. Upgrade guidance in validator msg | DR-0088 (pending), AD-004 | Immediate error for weak format breaks existing packs. Migration window with guidance enables smooth transition to 8-field strong schema                |
| SD-0034-003 | Anti-preference traceability scope in v1.7.8 | Trace anti-preferences at 3 points: taste interview -> dynamic axes -> review bundle only   | DR-0091 (pending), AD-007 | Full-flow traceability (taste -> trend -> axes -> review -> critique) is scope-excessive for v1.7.8. 3-point coverage is sufficient for initial release |

## Rejected Options

| DEC-ID      | Rejected Option                                    | Reason                                                                                                |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| SD-0034-001 | 4-axis format immediately errors in v1.7.8         | Breaks existing adopters without migration window; violates NFR-0001 backward compatibility (RJ-003)  |
| SD-0034-001 | Maintain 4-axis as equal canonical model           | Prevents SSOT convergence; violates NFR-0005. 3-layer is the sole canonical model                     |
| SD-0034-002 | Weak strategy format immediately errors in v1.7.8  | Same rationale as SD-0034-001: migration window required for backward compatibility                   |
| SD-0034-002 | Keep weak format as permanent alternative          | Prevents schema convergence; ambiguous strategy artifacts reduce review quality                       |
| SD-0034-003 | Full anti-preference traceability across all flows | Scope excessive for v1.7.8; cross-flow traceability requires infrastructure not yet in place (RJ-004) |
| SD-0034-003 | No anti-preference traceability                    | Loses connection between taste input and downstream evaluation; taste interview value diminished      |
