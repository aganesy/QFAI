# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0019 (DDP), spec-0020 (Navigation), spec-0021 (Render Critique), spec-0022 (Fidelity), spec-0025 (Design Audit)
- All discussion-phase UI/UX workflows unified under CAP-0010

## Adopted

- AD-0010-0001: Unified discussion workflow -- merged discuss and require into single 15-file pack with OQ-driven exit
- AD-0010-0002: DDP consolidation -- Design Direction Pack authoring from old spec-0019 integrated into discussion workflow
- AD-0010-0003: UI-bearing detection -- surface type classification as primary SSOT (from spec-0022 fidelity concepts)
- AD-0010-0004: 12-reviewer RCP -- devils-advocate and pattern-doubler integrated (from spec-0012 review agent extension)
- AD-0010-0005: Competitive references -- mandatory 3+ references for UI-bearing packs (from spec-0025 design audit)

### v1.7.12 Convergence Corrections (Bundle A + B)

- AD-0010-0006: 3-layer canonical model -- 4-axis evaluation template family (files 20–23) replaced by 3-layer model (invariant / trend-derived / product-specific) per DR-0106 (discussion-20260401215536131 D-001, D-004)
  - SKILL.md rewritten to teach 3-layer model exclusively (REQ-0001)
  - `qfai init` generates new 3-layer family only (REQ-0002)
  - `00_index.md` updated to list canonical family only (REQ-0003)
  - `10_strategy.md` upgraded to strong schema (surface classification, strategy, rationale) (REQ-0004)
  - `40_screen_contracts.md` upgraded to screen-obligation schema with secondary_tasks (REQ-0005)
  - `04_Sources.md` upgraded for trend/reference translation (REQ-0006)
- AD-0010-0007: HTML/CSS mock demotion -- HTML/CSS visual mocks demoted from required completion gate to optional/fallback reference material per DR-0107 (discussion-20260401215536131 D-002) (REQ-0007)
- AD-0010-0008: Acceptance criteria update -- AC/TC/EX updated for new 3-layer artifact family and HTML/CSS optional status (REQ-0008)

## Rejected

- RJ-0010-0001: Figma integration
  - DO NOT add Figma/Sketch tool dependencies
  - Temptation: adding external design tool APIs for richer mocks
  - Reason: QFAI is tool-independent; HTML+CSS mocks are self-contained

- RJ-0010-0002: Generic SaaS card grid as default template
  - DO NOT use generic card grid patterns as defaults
  - Temptation: using common SaaS patterns for quick starts
  - Reason: per DR-0032, generic patterns are banned to enforce design intentionality

### v1.7.12 Rejections

- RJ-0010-0003: Keep HTML/CSS mock as required completion gate
  - DO NOT restore HTML/CSS mock as a completion requirement
  - Temptation: restoring mandatory mocks to ensure visual validation
  - Reason: per DR-0107, CSS generation quality is insufficient to gate completion; taste interview + design contracts provide equivalent design intent capture

- RJ-0010-0004: Gradual 4-axis deprecation in new generation
  - DO NOT generate 4-axis files with deprecation warnings in new projects
  - Temptation: keeping 4-axis files with warnings for backward compatibility
  - Reason: per DR-0106, the migration window concluded at v1.7.12 (complete removal from active paths); new generation must be clean from day one

## ID Renumbering

| Old ID             | New ID                                     | Notes                 |
| ------------------ | ------------------------------------------ | --------------------- |
| spec-0019 US/TC/BR | US-0010-YYYY / TC-0010-YYYY / BR-0010-YYYY | DDP parts             |
| spec-0020 US/TC    | US-0010-YYYY / TC-0010-YYYY                | Navigation parts      |
| spec-0021 US/TC    | US-0010-YYYY / TC-0010-YYYY                | Render Critique parts |
| spec-0022 US/TC    | US-0010-YYYY / TC-0010-YYYY                | Fidelity parts        |
| spec-0025 US/TC    | US-0010-YYYY / TC-0010-YYYY                | Design Audit parts    |

## v1.7.12 Addition Log

| ID           | Type     | Description                                         |
| ------------ | -------- | --------------------------------------------------- |
| US-0010-0009 | US       | SKILL.md rewrite for 3-layer model                  |
| US-0010-0010 | US       | 3-layer template family replacement                 |
| US-0010-0011 | US       | Canonical sidecar index and strategy upgrade        |
| US-0010-0012 | US       | Sources template trend translation                  |
| US-0010-0013 | US       | HTML/CSS mock demotion to optional                  |
| US-0010-0014 | US       | Contracts template screen-obligation schema         |
| AC-0010-0012 | AC       | SKILL.md 3-layer model exclusivity                  |
| AC-0010-0013 | AC       | Init generates 3-layer family only                  |
| AC-0010-0014 | AC       | Canonical index manifest                            |
| AC-0010-0015 | AC       | Strategy template strong schema                     |
| AC-0010-0016 | AC       | Contracts screen-obligation schema                  |
| AC-0010-0017 | AC       | Sources trend evaluation support                    |
| AC-0010-0018 | AC       | HTML/CSS mock not a completion gate                 |
| BR-0010-0009 | BR       | 4-axis exclusion from active generation             |
| BR-0010-0010 | BR       | Init and dogfood semantic parity                    |
| BR-0010-0011 | BR       | HTML/CSS mock not a completion gate                 |
| BR-0010-0012 | BR       | Template file naming validator alignment            |
| EX-0010-0011 | EX       | UI-bearing pack with 3-layer sidecar (happy)        |
| EX-0010-0012 | EX       | Pack missing taste interview (fail)                 |
| EX-0010-0013 | EX       | Pack missing trend-derived evaluation (fail)        |
| EX-0010-0014 | EX       | Non-UI pack skips 3-layer sidecar without errors    |
| EX-0010-0015 | EX       | Init copy vs dogfood copy parity check              |
| TC-0010-0018 | TC       | SKILL.md 3-layer model exclusivity                  |
| TC-0010-0019 | TC       | Init generates 3-layer family only                  |
| TC-0010-0020 | TC       | HTML/CSS mock not blocking completion               |
| TC-0010-0021 | TC       | 00_index.md canonical family listing                |
| TC-0010-0022 | TC       | 10_strategy.md strong schema validation             |
| TC-0010-0023 | TC       | 40_screen_contracts.md screen-obligation schema     |
| TC-0010-0024 | TC       | 04_Sources.md trend evaluation support              |
| TC-0010-0025 | TC       | No 4-axis files in active generation                |
| TC-0010-0026 | TC       | Init vs dogfood semantic parity                     |
| TC-0010-0027 | TC       | Taste interview absence fails sidecar validation    |
| TC-0010-0028 | TC       | Trend-derived axis missing source translation fails |
| SD-0010-0001 | Decision | 3-layer canonical replaces 4-axis (DR-0106)         |
| SD-0010-0002 | Decision | HTML/CSS mock optional/fallback (DR-0107)           |

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0016 (prototyping.yaml generation) 追加
- adopted: US-0010-0015, AC-0010-0015~0016 追加
- rationale: v1.7.13 で prototyping.yaml が discussion-pack の必須サイドアーティファクトになった実装の仕様反映
