# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0025-0001
Scenario: Design audit findings are emitted for UI-bearing packs
  Given a UI-bearing discussion pack exists with DDP, contracts, and optional HTML mocks
  When qfai validate runs with audit.enabled: true
  Then designAudit.ts produces findings across 7 dimensions
  And each finding has a stable QFAI-AUD-XXX rule ID
  And each finding includes evidence file paths and remediation guidance
```

```gherkin
# AC-0025-0002
Scenario: Non UI-bearing packs skip design audit entirely
  Given a non UI-bearing discussion pack
  When qfai validate runs
  Then designAudit.ts produces zero findings
  And designSlop.ts produces zero findings
```

```gherkin
# AC-0025-0003
Scenario: Slop guardrails detect AI-generated low-quality patterns
  Given a UI-bearing pack with generic AI UI patterns
  When qfai validate runs with slopDetection: true
  Then designSlop.ts produces findings with QFAI-SLP-XXX rule IDs
  And findings are loaded from designSlopPatterns.json rules
  And each finding includes category, message, and guidance
```

```gherkin
# AC-0025-0004
Scenario: Missing primary CTA is a structural-blocking error
  Given a UI-bearing pack with anchor screen but no primary CTA defined
  When qfai validate runs
  Then QFAI-AUD-001 is emitted with severity error
  And the finding references the anchor screen location
```

```gherkin
# AC-0025-0005
Scenario: Design tokens exist but contracts bypass them with raw values
  Given design tokens are defined and UI contracts contain repeated raw color/spacing values
  When qfai validate runs
  Then QFAI-AUD-004 is emitted with severity error
  And the finding counts the raw literal occurrences exceeding the threshold
```

```gherkin
# AC-0025-0006
Scenario: Dual-primary CTA is a strong-advisory warning
  Given a UI-bearing pack with anchor screen declaring 2 primary CTAs
  When qfai validate runs with qualityProfile: default
  Then QFAI-AUD-020 is emitted with severity warning
  And the finding explains why competing primaries weaken task focus
```

```gherkin
# AC-0025-0007
Scenario: Quality profile controls tier-to-severity mapping
  Given the same UI-bearing pack with findings across all tiers
  When qfai validate runs with qualityProfile default, high, and strict respectively
  Then Tier 1 rules are error in all profiles
  And Tier 2 rules are warning in default/high and error in strict
  And Tier 3 cosmetic rules are info in default and warning in high/strict
```

```gherkin
# AC-0025-0008
Scenario: audit.enabled false disables all v1.7.2 validators
  Given config has uiux.audit.enabled: false
  When qfai validate runs on a UI-bearing pack
  Then designAudit.ts and designSlop.ts produce zero findings
  And existing validators continue to run normally
```

```gherkin
# AC-0025-0009
Scenario: slopDetection false disables only slop validators
  Given config has uiux.audit.enabled: true and uiux.audit.slopDetection: false
  When qfai validate runs on a UI-bearing pack
  Then designAudit.ts produces findings normally
  And designSlop.ts produces zero findings
```

```gherkin
# AC-0025-0010
Scenario: Config omission defaults to all validators enabled
  Given config does not include uiux.audit section
  When qfai validate runs on a UI-bearing pack
  Then designAudit.ts runs with default settings
  And designSlop.ts runs with default settings
  And qualityProfile defaults to "default"
```

```gherkin
# AC-0025-0011
Scenario: Report groups findings by Design Audit and Slop Guardrails
  Given both design audit and slop findings exist
  When qfai report generates output
  Then "Design Audit Findings" section lists audit findings grouped by dimension
  And "Slop Guardrails Findings" section lists slop findings by category
  And each finding includes rule ID, why, evidence, and guidance
```

```gherkin
# AC-0025-0012
Scenario: Finding deduplication respects configurable threshold
  Given a UI-bearing pack triggers the same rule more than maxDuplicateFindingsPerRule times
  When qfai validate runs
  Then the first N findings are emitted individually
  And excess findings are aggregated into one summary issue with count
```

```gherkin
# AC-0025-0013
Scenario: Tier 3 default profile splits info/warning by category
  Given qualityProfile is default and Tier 3 rules fire
  When the severity mapper processes the findings
  Then cosmetic categories (SLP-01, SLP-02, SLP-05) map to info
  And functional categories (SLP-03, SLP-04, SLP-06) map to warning
```

```gherkin
# AC-0025-0014
Scenario: Validators register correctly in index.ts
  Given designAudit.ts and designSlop.ts are created
  When validators/index.ts is imported
  Then validateDesignAudit and validateDesignSlop are exported
```

```gherkin
# AC-0025-0015
Scenario: Existing tests pass without modification
  Given v1.7.2 changes are applied
  When the full test suite runs on Node 18 and Node 20
  Then all existing tests pass
  And no existing validator behavior changes
```

## AC Catalog (optional)

| AC-ID        | Title                                | Notes                             | Priority |
| ------------ | ------------------------------------ | --------------------------------- | -------- |
| AC-0025-0001 | Design audit findings for UI-bearing | 7 dimensions, stable QFAI-AUD IDs | P1       |
| AC-0025-0002 | Non UI-bearing skip                  | Zero findings                     | P1       |
| AC-0025-0003 | Slop guardrails detection            | SLP-01〜SLP-06, JSON rules        | P1       |
| AC-0025-0004 | Missing primary CTA error            | Tier 1 structural-blocking        | P1       |
| AC-0025-0005 | Token drift detection                | Threshold-based                   | P1       |
| AC-0025-0006 | Dual-primary CTA warning             | Tier 2 strong-advisory            | P1       |
| AC-0025-0007 | Quality profile severity mapping     | 3 profiles × 3 tiers              | P1       |
| AC-0025-0008 | audit.enabled false                  | Full disable                      | P1       |
| AC-0025-0009 | slopDetection false                  | Slop-only disable                 | P1       |
| AC-0025-0010 | Config omission defaults             | All enabled by default            | P1       |
| AC-0025-0011 | Report grouping                      | 2 sections                        | P1       |
| AC-0025-0012 | Finding deduplication                | Config threshold                  | P2       |
| AC-0025-0013 | Tier 3 category-based severity       | info/warning split                | P2       |
| AC-0025-0014 | Validator registration               | index.ts export                   | P1       |
| AC-0025-0015 | Backward compatibility               | Existing tests pass               | P1       |
