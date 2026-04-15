# 99 Delta

Change history for discussion pack: discussion-20260415203030886 (rev7).

## Pack Version History

| Version | Date       | Author | Summary |
|---------|------------|--------|---------|
| v1.0    | 2026-04-15 | agent  | Initial creation of all 15 discussion pack files for v1.7.15-07 audit closure (rev7). |

---

## Adopted Decisions

All 5 OQ resolutions from `11_OQ-Register.md` and `12_OQ-Resolution-Log.md`:

| OQ-ID   | Title                                                          | Adopted Decision                                                                                   |
|---------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| OQ-0001 | packHash inclusion in calibrationRef                          | **Option B adopted**: Defer packHash. Not required for v1.7.15-07 audit; design doc marks it conditional ("packHash（導入する場合）"). |
| OQ-0002 | Error class location (prototyping/errors.ts vs core/errors.ts) | **Option A adopted**: New file `packages/qfai/src/core/prototyping/errors.ts`. Co-location with prototyping modules; SRP. |
| OQ-0003 | configPath in calibrationRef — mandatory vs optional           | **Option A adopted**: Optional (`configPath?: string`). Design doc states "存在するなら" — comparison is conditional. |
| OQ-0004 | Scalar field obsolete detection — parse-time vs normalize-time | **Option A adopted**: normalize-time. Consistent with existing `config.ts` normalization patterns. |
| OQ-0005 | surfacePolicy.ts rejection message — generated vs hardcoded    | **Option B adopted**: Generate from `PROTOTYPING_SUPPORTED_SURFACES` constant. DRY; eliminates staleness root cause. |

---

## Rejected Options

| OQ-ID   | Rejected Option | Reason for Rejection |
|---------|-----------------|----------------------|
| OQ-0001 | Option A: Include packHash now | No audit requirement; design doc marks as optional; adds infrastructure complexity without benefit in this cycle. |
| OQ-0002 | Option B: Extend core/errors.ts | Violates SRP; couples domain-specific errors to a general utility module. |
| OQ-0003 | Option B: configPath mandatory | Incompatible with pack configurations without a config overlay (the common case). Contradicts design doc's conditional phrasing. |
| OQ-0004 | Option B: parse-time detection | Requires JSON schema infrastructure changes; deviates from existing codebase pattern without added benefit. |
| OQ-0005 | Option A: Hardcode "web/mobile/desktop/mixed" | Does not eliminate the root cause (hardcoded string diverging from constant); staleness problem can recur. |

---

## Rejected Visual Directions

Not applicable — non-UI pack.

---

## Upstream Reference

This discussion pack (rev7) is a new, independent audit closure cycle. It does not modify or reopen items from the upstream rev6 pack (discussion-20260415161758193). Rev6 issues (mode rejection, surface policy, `uiContractId` matching, `reviewerSignoff` semantics, concrete evidenceRefs for `runtimeGate`) remain closed.
