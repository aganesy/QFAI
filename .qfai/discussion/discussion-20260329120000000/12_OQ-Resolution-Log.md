# 12 OQ Resolution Log

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Resolution Timeline

### Round 1 (2026-03-29)

#### OQ-0001: Legacy pack warning-to-error ratchet timing

- **Status**: open -> resolved
- **Decision**: Option B adopted -- warning default with `uiux.migration.strict: true` config flag for error escalation
- **Rationale**: Immediate error enforcement would break legacy projects without migration path. Phased approach (warning -> config-opt-in error -> v1.8 default error) provides adoption runway.
- **Impact**: 10_Policy updated with 3-phase migration enforcement policy. REQ-0016 updated to reflect warning default.

#### OQ-0004: Stale asset auto-refresh helper necessity

- **Status**: open -> resolved
- **Decision**: Option B adopted -- migration guidance only in v1.7.4, auto-refresh deferred to v1.8
- **Rationale**: Auto-refresh requires CLI command infrastructure and template diffing logic that is out of scope for a stabilization release. Migration guidance (step-by-step instructions in error output) is sufficient for v1.7.4.
- **Impact**: REQ-0020 scoped to guidance only. US-D004 example seeds updated.

#### OQ-0005: UIX-VAL rule ID naming convention

- **Status**: open -> resolved
- **Decision**: Option B adopted -- semantic names (e.g., `UIX-VAL-SIDECAR-MISSING`) for readability
- **Rationale**: Existing code uses both patterns (`QFAI-AUD-001` numeric, `SLP-01` short). Semantic names improve error actionability (user can understand the issue from the ID alone). Consistent with report UX goal.
- **Impact**: REQ-0003, REQ-0004, REQ-0018 updated with semantic ID examples.

#### OQ-0006: Config key for migration severity escalation

- **Status**: open -> resolved
- **Decision**: Option A adopted -- `uiux.migration.strict: true`
- **Rationale**: Simplest config path. Aligns with existing `uiux` section structure. Boolean is clearer than severity string for a binary decision (warn vs. error).
- **Impact**: 10_Policy Phase 2 updated. NFR-0005 measurement updated.

#### OQ-0002: Reviewer disagreement schema formalization timeline

- **Status**: open -> deferred
- **Decision**: Deferred to v1.8
- **Rationale**: v1.7.4 focuses on stabilization. Reviewer prompt structure tests (REQ-0022) provide sufficient coverage for v1.7.4. Full schema formalization requires broader design discussion.
- **Impact**: 13_Deferred.md entry created.

#### OQ-0003: Report UX localized variants

- **Status**: open -> deferred
- **Decision**: Deferred to v1.8
- **Rationale**: English-only report is acceptable for v1.7.4. Localization requires i18n infrastructure that is out of scope for a stabilization release.
- **Impact**: 13_Deferred.md entry created.
