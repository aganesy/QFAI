# 12 OQ Resolution Log

Resolution log for discussion-20260416023323603 (rev8).

| OQ-ID   | Title                                                              | Created    | Resolved   | Resolved By | Resolution Summary                                                                                                                                                              |
|---------|--------------------------------------------------------------------|------------|------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| OQ-0001 | pathUtils.ts: new file vs inline in specCoverage.ts                | 2026-04-16 | 2026-04-16 | agent       | Option A adopted: new file `pathUtils.ts`. Design doc §6-1-1 explicitly defines the helper interface. §6-3-1 requires a single package-level helper. Inline helpers cannot be shared with the validator. |
| OQ-0002 | measurement.ts scope — is it a changed file for WS-3?             | 2026-04-16 | 2026-04-16 | agent       | Option B adopted: include `measurement.ts` in WS-3 scope (conservative). Design doc §6 WS-3 lists it explicitly. If no change is needed after empirical check, the file is left unchanged. |
| OQ-0003 | runtimeGate.evidenceRefs — empty array vs "no refs required"      | 2026-04-16 | 2026-04-16 | agent       | Option A adopted: empty array is always a validator error. Design doc §6-2-3 is explicit ("empty array も error"). Fail-closed policy confirmed by §3-2. No special case introduced. |
| OQ-0004 | README.md update scope — conditional vs unconditional             | 2026-04-16 | 2026-04-16 | agent       | Option A adopted: conditional update. Design doc §7-8 gives explicit conditional criterion ("変更条件付き"). Update only if obsolete or absent description exists; avoid unnecessary churn. |
