# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0027 (UIX-VAL/UIX-REV), spec-0037 (SSOT Unification)
- Old spec-0027 defined UIX-VAL deterministic validators and UIX-REV semantic reviewers
- Old spec-0037 defined migration paths, feature maturity normalization, non-UI safety

## Adopted

- AD-0014-0001: Full-scan verify -- always full-scan, never incremental (DR-0007 preserved)
- AD-0014-0002: UIX-VAL validators -- deterministic UI/UX artifact validation from spec-0027
- AD-0014-0003: UIX-REV reviewers -- semantic review prompt templates from spec-0027
- AD-0014-0004: Non-UI safety -- zero UIX fires on non-UI projects (from spec-0037)
- AD-0014-0005: Migration support -- 3-version migration path (old/intermediate/final) from spec-0037
- AD-0014-0006: Feature maturity normalization -- canonical vocabulary from spec-0037

## Rejected

- RJ-0014-0001: Incremental verification
  - DO NOT implement diff-only verification in `/qfai-verify`
  - Temptation: using diff-only for faster CI runs
  - Reason: verify is the safety gate and must not be reduced to incremental checks (DR-0007)

- RJ-0014-0002: Error-level waivers
  - DO NOT allow waivers to suppress error-severity findings
  - Temptation: waiving errors for "known issues" or "legacy code"
  - Reason: errors must be fixed at source; waivers are for warning/info only

## ID Renumbering

| Old ID                                | New ID                      | Notes            |
| ------------------------------------- | --------------------------- | ---------------- |
| spec-0027 US-0027-YYYY / TC-0027-YYYY | US-0014-YYYY / TC-0014-YYYY | UIX-VAL/UIX-REV  |
| spec-0037 US-0037-YYYY / TC-0037-YYYY | US-0014-YYYY / TC-0014-YYYY | SSOT Unification |

## v1.7.12 — Evidence / Browser QA Convergence (Bundle C)

### Context

- Discussion pack decisions: D-001 (3-layer evaluation model as canonical), Browser QA (keep minimal truthful runner)
- Requirements: REQ-0011 (canonical validator family enforcement), REQ-0013 (truthful evidence state handling), REQ-0014 (browser QA truthful implementation)

### Added

| ID           | Layer | Summary                                            |
| ------------ | ----- | -------------------------------------------------- |
| US-0014-0007 | US    | Truthful evidence state handling                   |
| US-0014-0008 | US    | Browser QA minimal truthful runner                 |
| US-0014-0009 | US    | Canonical validator family enforcement             |
| AC-0014-0009 | AC    | Truthful evidence states (5 canonical states)      |
| AC-0014-0010 | AC    | Browser QA minimum runner                          |
| AC-0014-0011 | AC    | Canonical validator set enforcement (D-001)        |
| BR-0014-0007 | BR    | Evidence states must be truthful (no placeholders) |
| BR-0014-0008 | BR    | Browser QA findings not always empty               |
| BR-0014-0009 | BR    | Canonical validator family from 3-layer model      |
| EX-0014-0008 | EX    | Truthful evidence — captured (pass)                |
| EX-0014-0009 | EX    | Placeholder evidence (fail)                        |
| EX-0014-0010 | EX    | Browser QA with findings (pass)                    |
| EX-0014-0011 | EX    | Browser QA empty findings (warning)                |
| EX-0014-0012 | EX    | Canonical validator set enforced (pass)            |
| EX-0014-0013 | EX    | Non-canonical validator rejected (fail)            |
| TC-0014-0012 | TC    | Truthful evidence state — captured pass            |
| TC-0014-0013 | TC    | Placeholder evidence rejection                     |
| TC-0014-0014 | TC    | Browser QA with findings accepted                  |
| TC-0014-0015 | TC    | Browser QA empty findings warning                  |
| TC-0014-0016 | TC    | Canonical validator set enforcement                |
| TC-0014-0017 | TC    | Non-canonical validator rejection                  |

### Traceability Chain (v1.7.12 additions)

```text
US-0014-0007 → AC-0014-0009 → BR-0014-0007 → EX-0014-0008, EX-0014-0009 → TC-0014-0012, TC-0014-0013
US-0014-0008 → AC-0014-0010 → BR-0014-0008 → EX-0014-0010, EX-0014-0011 → TC-0014-0014, TC-0014-0015
US-0014-0009 → AC-0014-0011 → BR-0014-0009 → EX-0014-0012, EX-0014-0013 → TC-0014-0016, TC-0014-0017
```

### Rejected

- None for v1.7.12 slice

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0013~0014 (canonical UIX validators, legacy compatibility path) 追加
- adopted: US-0014-0010~0011, AC-0014-0012~0013 追加
- rationale: v1.7.13 canonical/legacy validator 分離の実装の仕様反映。production path は runCanonicalUixValidators のみ
