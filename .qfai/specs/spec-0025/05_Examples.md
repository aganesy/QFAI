# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                     | Expected                                                                             | Notes                                    |
| ------------ | ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| EX-0025-0001 | BR-0025-0001 | Non UI-bearing pack (CLI tool only discussion)                                            | designAudit: 0 findings, designSlop: 0 findings                                      | UI-bearing gating happy path             |
| EX-0025-0002 | BR-0025-0001 | UI-bearing pack with DDP + contracts                                                      | designAudit: findings based on content, designSlop: findings based on patterns       | UI-bearing gating positive               |
| EX-0025-0003 | BR-0025-0002 | UI-bearing pack with clean DDP, valid tokens, all states defined, clear hierarchy         | 0 findings across all 7 dimensions                                                   | All dimensions pass                      |
| EX-0025-0004 | BR-0025-0007 | anchor screen with no primary CTA defined in DDP/Story Workshop                           | QFAI-AUD-001 emitted, severity: error, evidence points to anchor screen              | Missing primary CTA                      |
| EX-0025-0005 | BR-0025-0008 | design tokens exist, UI contracts contain 6 raw hex color values                          | QFAI-AUD-004 emitted, severity: error, count: 6, threshold: 5                        | Token drift over threshold               |
| EX-0025-0006 | BR-0025-0008 | design tokens exist, UI contracts contain 4 raw hex color values                          | 0 findings (below threshold of 5)                                                    | Token drift under threshold (boundary)   |
| EX-0025-0007 | BR-0025-0009 | anchor screen with 2 primary CTAs declared                                                | QFAI-AUD-020 emitted, severity depends on profile                                    | Dual-primary CTA                         |
| EX-0025-0008 | BR-0025-0009 | anchor screen with exactly 1 primary CTA                                                  | 0 findings for CTA hierarchy                                                         | Single primary CTA (boundary)            |
| EX-0025-0009 | BR-0025-0006 | designSlopPatterns.json with valid entry {id,category,tier,scopes,match,message,guidance} | Rule loaded and available for matching                                               | Valid JSON rule                          |
| EX-0025-0010 | BR-0025-0006 | designSlopPatterns.json missing 'guidance' field in one entry                             | JSON parse warning, rule skipped, validate continues                                 | Invalid JSON rule (graceful degradation) |
| EX-0025-0011 | BR-0025-0010 | qualityProfile: default, Tier 1 rule fires                                                | severity: error                                                                      | Tier 1 in default profile                |
| EX-0025-0012 | BR-0025-0011 | qualityProfile: default, Tier 2 rule fires                                                | severity: warning                                                                    | Tier 2 in default profile                |
| EX-0025-0013 | BR-0025-0011 | qualityProfile: strict, Tier 2 rule fires                                                 | severity: error                                                                      | Tier 2 in strict profile                 |
| EX-0025-0014 | BR-0025-0012 | qualityProfile: default, SLP-01 (cosmetic) fires                                          | severity: info                                                                       | Tier 3 cosmetic in default               |
| EX-0025-0015 | BR-0025-0012 | qualityProfile: default, SLP-04 (functional) fires                                        | severity: warning                                                                    | Tier 3 functional in default             |
| EX-0025-0016 | BR-0025-0012 | qualityProfile: high, SLP-01 (cosmetic) fires                                             | severity: warning                                                                    | Tier 3 cosmetic in high                  |
| EX-0025-0017 | BR-0025-0013 | config: audit.enabled: false, UI-bearing pack                                             | designAudit: 0 findings, designSlop: 0 findings                                      | Full disable                             |
| EX-0025-0018 | BR-0025-0014 | config: slopDetection: false, UI-bearing pack with slop patterns                          | designAudit: findings present, designSlop: 0 findings                                | Slop-only disable                        |
| EX-0025-0019 | BR-0025-0015 | config: uiux.audit section completely absent                                              | All defaults applied: enabled=true, slopDetection=true, qualityProfile=default       | Config omission                          |
| EX-0025-0020 | BR-0025-0016 | audit findings for tokenDiscipline and visualHierarchy dimensions                         | Report shows "Design Audit Findings" with 2 dimension groups                         | Report grouping by dimension             |
| EX-0025-0021 | BR-0025-0017 | slop findings for SLP-01 and SLP-04 categories                                            | Report shows "Slop Guardrails Findings" with 2 category groups                       | Report grouping by category              |
| EX-0025-0022 | BR-0025-0016 | zero audit findings                                                                       | "Design Audit Findings" section omitted from report                                  | Empty section omission                   |
| EX-0025-0023 | BR-0025-0018 | same rule QFAI-AUD-004 fires 8 times, maxDuplicateFindingsPerRule=5                       | 5 individual findings + 1 summary "and 3 more"                                       | Deduplication over threshold             |
| EX-0025-0024 | BR-0025-0018 | same rule fires 4 times, maxDuplicateFindingsPerRule=5                                    | 4 individual findings, no summary                                                    | Deduplication under threshold (boundary) |
| EX-0025-0025 | BR-0025-0005 | finding with ruleId, dimension, severityTier, message, why, evidence, guidance            | Converts to Issue with code=ruleId, severity from profile, message, rule, file, refs | Finding to Issue conversion              |
| EX-0025-0026 | BR-0025-0019 | import validators/index.ts                                                                | validateDesignAudit and validateDesignSlop are accessible exports                    | Validator registration                   |
| EX-0025-0027 | BR-0025-0020 | run full test suite after v1.7.2 changes, Node 18                                         | All existing tests pass, zero regressions                                            | Backward compat Node 18                  |
| EX-0025-0028 | BR-0025-0020 | run full test suite after v1.7.2 changes, Node 20                                         | All existing tests pass, zero regressions                                            | Backward compat Node 20                  |
