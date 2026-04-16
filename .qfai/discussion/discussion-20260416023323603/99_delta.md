# 99 Delta

Delta log for discussion-20260416023323603 (rev8).
Upstream: discussion-20260415203030886 (rev7).

## Adopted Decisions

| Decision-ID | Decision                                                                                                                  | Rationale                                                                                                         |
|-------------|---------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| ADO-001     | Discussion ID `discussion-20260416023323603` created for rev8 (01_Context.md)                                             | New audit cycle requires new discussion ID. Rev8 is an independent discussion from rev7.                         |
| ADO-002     | `ui_bearing: false` classification retained from rev7 pattern (02_Inception-Deck.md, 01_Context.md)                     | Same rationale as rev7: pure internal TypeScript code changes (validators, specCoverage, tests). No UI screens involved. Classification is stable. |
| ADO-003     | OQ-0001 resolved: new `pathUtils.ts` file adopted (11_OQ-Register.md, 12_OQ-Resolution-Log.md)                          | Design doc §6-1-1 explicitly defines the helper interface. §6-3-1 requires a single package-level helper location. Inline helpers cannot be shared with the validator without coupling. |
| ADO-004     | OQ-0002 resolved: `measurement.ts` included in WS-3 scope (conservative) (11_OQ-Register.md)                            | Design doc §6 WS-3 explicitly lists `measurement.ts` as a changed file. Conservative scope prevents missing an absolute-path ref site. |
| ADO-005     | OQ-0003 resolved: empty `runtimeGate.evidenceRefs` array is a validator error (11_OQ-Register.md)                       | Design doc §6-2-3 explicit ("empty array も error"). Fail-closed policy from §3-2. No special case for "no routes observed". |
| ADO-006     | OQ-0004 resolved: README update is conditional (update only if obsolete/absent) (11_OQ-Register.md)                     | Design doc §7-8 gives explicit conditional criterion. Avoids unnecessary churn on stable README content.          |
| ADO-007     | 4 workstreams defined (WS-1 through WS-4) mapping directly to design doc §6 (05_Scope.md, 06_REQ.md)                    | Design doc §6 organizes changes into 4 workstreams. This pack mirrors that structure for traceability.            |
| ADO-008     | Architecture review requested (14_Review-Request.md)                                                                     | New `pathUtils.ts` module + validator schema extension for `runtimeGate.evidenceRefs` are architecture-affecting decisions requiring sign-off. |

## Rejected Directions

| Rejected-ID | Rejected Option                                                                                                           | Recurrence Prevention                                                                                             |
|-------------|---------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| REJ-001     | OQ-0001 Option B: inline helpers in `specCoverage.ts`                                                                    | Inline helpers cannot be shared between builders and validators without creating a coupling that violates the module structure. Future grammar changes would require duplicate edits. Centralize in `pathUtils.ts`. |
| REJ-002     | OQ-0003 Option B: allow empty `runtimeGate.evidenceRefs` array when no routes observed                                   | Leniency on empty arrays contradicts design doc §6-2-3 explicit guidance and the fail-closed policy in §3-2. Allowing empty arrays would silently pass evidence-free runs. Fail-closed is the correct default. |

## Rejected Visual Directions

N/A — non-UI pack. No visual directions to reject.

## Drift Events

No drift events. Rev8 is fully consistent with rev7 baseline. The upstream discussion-20260415203030886 (rev7) DoD conditions are not modified or weakened.
