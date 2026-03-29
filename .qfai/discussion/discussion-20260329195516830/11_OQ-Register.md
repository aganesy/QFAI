# 11 OQ Register

## OQ Table

| OQ-ID   | Title | Gate       | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due | Evidence |
| ------- | ----- | ---------- | ----------- | ----- | --------- | ------- | -------------- | ------------------- | --- | -------- |
| OQ-0001 | Evaluation architecture model choice | discussion | resolved | agent | 3-layer model aligns with final agreed design; 4-axis is legacy implementation artifact | (A) Converge to 3-layer model (invariant, trend-derived, product-specific) / (B) Formally abandon 3-layer and keep 4-axis (recommended: A) | Option A: Converge to 3-layer model | N/A | 2026-03-29 | SRC-0001 P1-01 |
| OQ-0002 | Render evidence completion vs downgrade | discussion | resolved | agent | Internal implementation exists but CLI path has placeholders; wiring is more valuable than downgrading | (A) Wire internal implementation to CLI/skill flow / (B) Downgrade public claim to foundation-only (recommended: A) | Option A: Wire to CLI/skill flow | N/A | 2026-03-29 | SRC-0001 P1-05, SRC-0008, SRC-0009 |
| OQ-0003 | UI-bearing detection primary SSOT | discussion | resolved | agent | Docs say surface classification is primary but validator infers from content; must enforce single truth | (A) Surface classification as primary, content signals as fallback / (B) Content signals as primary (recommended: A) | Option A: Surface classification as primary | N/A | 2026-03-29 | SRC-0001 P1-04, SRC-0006 |
| OQ-0004 | Versioning strategy for remediation | discussion | resolved | agent | Repo claims v1.7.6 done; Option 1 is operationally cleaner for shared/tagged repos | (A) v1.7.6a hotfix + v1.7.7 correction + v1.7.8 cleanup / (B) Reopen v1.7.6 as pre-release (recommended: A) | Option A: v1.7.6a + v1.7.7 + v1.7.8 | N/A | 2026-03-29 | SRC-0001 Section 6 |
| OQ-0005 | Browser QA implementation depth | discussion | deferred | agent | Browser QA is scaffold-level; full implementation requires design for phase execution and finding structure. Deferred to Correction Release C. | (A) Full implementation with structured findings / (B) Minimal viable findings only (recommended: A) | Option A: Full implementation | Start of Correction Release C | 2026-04-15 | SRC-0001 P1-06, SRC-0007 |
| OQ-0006 | Migration support scope | discussion | deferred | agent | Migration/upgrade support needs assessment of how many older versions to support. Deferred to Correction Release C. | (A) Support v1.7.5+ only / (B) Support v1.6+ with deprecation warnings (recommended: A) | Option A: Support v1.7.5+ only | Start of Correction Release C | 2026-04-15 | SRC-0001 P2-03 |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- `Options` must include at least two alternatives and one recommended option.
- `Recommendation` must explicitly state the recommended option.
- All 11 columns are mandatory for every row.
