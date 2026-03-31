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
