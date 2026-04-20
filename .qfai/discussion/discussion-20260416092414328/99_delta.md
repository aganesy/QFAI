# 99 Delta

Delta log for discussion-20260416092414328 (rev9).
Upstream: discussion-20260416023323603 (rev8).

## Adopted Decisions

| Decision-ID | Decision                                                                                                                              | Rationale                                                                                                                                           |
|-------------|---------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| ADO-001     | Discussion ID `discussion-20260416092414328` created for rev9 (01_Context.md)                                                         | New audit cycle requires new discussion ID. Rev9 is an independent discussion from rev8.                                                            |
| ADO-002     | `ui_bearing: false` classification retained from rev8 pattern (01_Context.md, 02_Inception-Deck.md)                                  | Same rationale as rev8: pure internal TypeScript code changes (validators, bundleWriter, tests). No UI screens involved. Classification is stable.  |
| ADO-003     | OQ-0001 resolved: ui[] row validation inline in `prototypingEvidence.ts` (Option A) (11_OQ-Register.md, 12_OQ-Resolution-Log.md)    | Design doc §6-1-2 names `prototypingEvidence.ts` as the changed file. Inline keeps validation cohesive. No new module boundary needed.              |
| ADO-004     | OQ-0002 resolved: `browserQaEvidenceRefs[]` always required non-empty (Option A) (11_OQ-Register.md)                                 | Design doc §3-2 fail-closed policy. Rev8 OQ-0003 precedent: empty evidenceRefs is always an error. No special-case for "no browser QA run".        |
| ADO-005     | OQ-0003 resolved: per-axis validation granularity (Option A) (11_OQ-Register.md)                                                     | Design doc §6-1-3 per-element language. Aggregate leniency would allow a subset of axes to lack evidence. Per-axis is the correct fail-closed granularity. |
| ADO-006     | OQ-0004 resolved: full README enumeration of all concrete-ref leaf fields (Option A) (11_OQ-Register.md)                             | Design doc §5-6 requires full docs/validator mismatch elimination. DoD condition "一部 field だけ strict という状態がどちらにも残らない" is a hard gate.  |
| ADO-007     | 4 workstreams defined (WS-1 through WS-4) mapping directly to design doc §6 (05_Scope.md, 06_REQ.md)                                 | Design doc §6 organizes changes into WS-1 through WS-4. This pack mirrors that structure for traceability.                                          |
| ADO-008     | Architecture review requested (14_Review-Request.md)                                                                                  | Validator contract surface extension to 6 leaf field groups + `bundleWriter.ts` breaking schema change are architecture-affecting decisions requiring sign-off. |
| ADO-009     | `packHash` carry-forward deferral noted (13_Deferred.md)                                                                              | `packHash` was deferred in rev7; remains out-of-scope for rev9. Recorded in 13_Deferred.md as OQ-D001 with full metadata.                          |

## Rejected Directions

| Rejected-ID | Rejected Option                                                                                                                  | Recurrence Prevention                                                                                                             |
|-------------|----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| REJ-001     | OQ-0001 Option B: extract `validateRuntimeGateUiRow()` to a separate utility file                                               | Extracting a small cohesive validation unit to a separate file increases module count without architectural benefit at this scale. If the function grows significantly, extraction can be revisited. For now, inline in `prototypingEvidence.ts` per design doc §6-1-2. |
| REJ-002     | OQ-0002 Option B: allow empty `browserQaEvidenceRefs[]` when no browser QA run recorded                                         | Empty arrays contradict the fail-closed principle (design doc §3-2). The same argument was rejected for `runtimeGate.evidenceRefs` in rev8 OQ-0003. Consistent enforcement means the builder must fail, not the validator must allow leniency. |
| REJ-003     | OQ-0003 Option B: only error if all axes have empty refs (aggregate leniency)                                                    | Aggregate leniency undermines the per-axis traceability contract. An axis could silently lack evidence if at least one other axis has refs. Per-axis validation is the only logically consistent approach. |
| REJ-004     | OQ-0004 Option B: minimal README extension note instead of full enumeration                                                      | A minimal note would likely leave the docs/validator partial-strictness mismatch unresolved, violating DoD §5-6. The design doc §9 explicitly prohibits "README の表現を弱めて整合したことにする". Full enumeration is mandatory. |

## Rejected Visual Directions

N/A — non-UI pack. No visual directions to reject.

## Drift Events

No drift events. Rev9 is fully consistent with the rev8 baseline and the v1.7.15-09 audit findings. The upstream discussion-20260416023323603 (rev8) DoD conditions are not modified or weakened. Rev9 only adds leaf-field closure on top of rev8.
