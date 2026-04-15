# 99 Delta

## Change History

| Version | Date | Change Type | Summary | Decided By |
|---------|------|-------------|---------|------------|
| discussion-20260415161758193 | 2026-04-15 | New | Initial discussion pack for QFAI v1.7.15 packages/qfai single-PR completion (rev6) | agent |

## Adopted Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| PROTOTYPING_SUPPORTED_SURFACES = [web, mobile, desktop, mixed] | Minimal UI-bearing set matching visual/browser evidence capability; `cli`, `api`, `backend` excluded per WS-2; `mixed` included as legitimate cross-platform visual surface | OQ-0001 |
| surfacePolicy.ts as standalone file at src/core/prototyping/surfacePolicy.ts | SRP: mode.ts already owns obligations derivation; surface allowlist is a separate concern enabling isolated unit tests and clean CLI import path | OQ-0002 |
| CalibrationLoader failure → throw Error immediately with packPath in message | Fail-fast precondition contract; no caller can silently bypass a missing or unresolvable pack; consistent with existing harness error patterns | OQ-0003 |
| reviewerLogs[].verdict stores mapped vocabulary (approve/revise/reject/abandon) | Reduces validator branching; consistent with reviewerSignoff.status vocabulary; downstream consumers see clean vocabulary at every read point without a translation step | OQ-0004 |
| uiContractId in observation record → hard-error | Backward compat explicitly abandoned per design doc; silent ignore would hide stale test fixtures, delaying cleanup and masking bugs | OQ-0005 |
| Backward compat abandoned for removed modes and surfaces | Design doc §0 states "後方互換は完全に捨てる"; single PR delivery requires atomic consistency; deprecation warnings would extend the stale-semantics period | SRC-0001 §0 |
| Single PR delivery for all 7 workstreams | Splitting into multiple PRs would create transient states where some contract enforcement layers are present and others are not, re-introducing audit failures | SRC-0001 §0, OC-01 |

## Rejected Options

| Option | Reason for Rejection | Recurrence Prevention |
|--------|---------------------|----------------------|
| PROTOTYPING_SUPPORTED_SURFACES excludes `mixed` (OQ-0001 Option B) | No technical reason to exclude `mixed`; it is a valid UI-bearing surface that supports visual browser evidence collection | If excluding `mixed` is proposed in a future PR, require an explicit technical constraint documented in surfacePolicy.ts as a comment |
| surfacePolicy as inline constants in mode.ts (OQ-0002 Option B) | Violates SRP; mode.ts already owns obligations derivation logic; co-locating surface allowlist there would create a dual-responsibility module | Any future proposal to consolidate surface policy into another file must include a SRP analysis showing no responsibility overlap |
| CalibrationLoader returns null or typed error object on failure (OQ-0003 Options B/C) | Null return allows a caller to proceed without a resolved pack, violating the strict contract; typed error (CalibrationPackError) is unnecessary overhead with no identified consumers needing instanceof checks | Any proposal to return null from a precondition loader must be treated as a safety regression; typed errors require an explicit consumer use case |
| reviewerLogs stores original pre-mapping vocabulary (OQ-0004 Option B) | Creates a translation layer between log storage and validator/consumer expectations, increasing complexity and potential for desynchronization | Original-vocabulary storage should only be reconsidered if a new audit trace requirement explicitly demands preservation of pre-mapping signals |
| uiContractId silently ignored (OQ-0005 Option B) | Hides stale code paths in test fixtures and user data; makes debugging observation attribution failures harder; inconsistent with "backward compat abandoned" principle | Any proposal to silently ignore schema fields must go through an explicit deprecation policy with a removal timeline |

## Rejected Visual Directions

Not applicable — this is a non-UI discussion pack (ui_bearing: false). No visual design directions were proposed or rejected.
