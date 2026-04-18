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
  - `10_implementation_strategy.md` upgraded to strong schema (surface classification, strategy, rationale) (REQ-0004)
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
| TC-0010-0022 | TC       | 10_implementation_strategy.md strong schema validation |
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
- adopted: US range 更新 US-0010-0001..US-0010-0015
- rationale: v1.7.13 で prototyping.yaml が discussion-pack の必須サイドアーティファクトになった実装の仕様反映

## v1.7.14 (2026-04-07) — Classification-Aware Requiredness & Namespaced-Only

- adopted: REQ-0017（Classification-Aware prototyping.yaml Requiredness）, REQ-0018（Namespaced-Only Schema Mandatory）追加
- adopted: US range 更新 US-0010-0001..US-0010-0015
- rationale: v1.7.14 の breaking change を仕様に反映:
  - **Classification-aware requiredness**: prototyping.yaml の必須性を classification に基づいて判定。ui_bearing=true のパックのみ prototyping.yaml を必須とし、non-UI パックは免除（DR-0110）
  - **Namespaced-only schema mandatory**: prototyping.yaml 生成時は `prototyping:` namespaced block のみ使用。legacy top-level keys は生成禁止（DR-0112）
  - **"selected direction" → "selected anchor"**: SKILL.md テンプレート内の用語統一
  - **cli as UI-bearing**: cli surface が discussion UI-bearing に明示的に含まれ、sidecar 生成対象に

### v1.7.14 Score Scope Annotation (2026-04-08)

- adopted: REQ-0019（Score Scope Annotation）追加
- rationale: full-harness インシデントレポートに基づく改善:
  - discussion SKILL.md に 3-layer scores の Score Scope 注記を追加（design direction quality であり implementation fidelity ではない旨）
  - prototyping.yaml 生成時に `recommended_mode: full-harness` の場合、`iteration_expectations` ブロックを追加
  - prototyping skill がスコアの射程の違いを認識して独自の evaluation criteria で実装品質を評価するよう導線を設定

## v1.7.16 (2026-04-18) — QFAI Package Design Quality Pipeline Restructure (Discussion Skill Additions)

### Context

- Source: discussion-20260418093755100 (18 REQs)
- In-scope REQs for spec-0010 this revision: REQ-0005 (Step 11.5 Trend→Axis derivation), REQ-0006 (04_Sources.md evaluation_connection field), REQ-0007 (21_design_eval_trend_derived.md visual axis examples), REQ-0009 (Sidecar Generation Flow 1c→1d dependency), REQ-0014 (Step 11.3 Brand→Aesthetic Mapping + DESIGN.md autonomous generation), REQ-0015 (references/design-md-brand-catalog.md), REQ-0016 (templates/uiux/12_design_system.md)
- Applicable NFRs: NFR-0007 (backward compatibility), NFR-0008 (AI-only operability), NFR-0009 (package independence), NFR-0010 (validate-speed budget), NFR-0011 (online-premise)

### Added

| ID                     | Layer | Summary                                                                 |
| ---------------------- | ----- | ----------------------------------------------------------------------- |
| REQ-0020..REQ-0026     | REQ   | Step 11.5, 04_Sources evaluation_connection, 21_design_eval_trend_derived visual axes, Sidecar Gen Flow dep, Step 11.3 Brand→Aesthetic Mapping, brand catalog reference, 12_design_system.md template |
| NFR-0007..NFR-0011     | NFR   | Backward compatibility, AI-only operability, package independence, validate-speed budget, online premise |
| US-0010-0016..0022     | US    | 7 user stories covering Step 11.3 / Step 11.5 / templates / catalog / sidecar flow |
| AC-0010-0019..0027     | AC    | 9 acceptance criteria with Given/When/Then and US-Ref                   |
| BR-0010-0013..0020     | BR    | 8 business rules (Step 11.5 visual axis, T04 trigger, 12_design_system.md 8 sections, brand catalog lookup, phase sequencing, Sidecar 1c→1d, evaluation_connection mandate, visual axis example requirement) |
| EX-0010-0018..0034     | EX    | 17 examples covering happy/negative/edge/permission/state/idempotency   |
| TC-0010-0031..0048     | TC    | 18 test cases with EX-Ref, AC-Refs, Type                                |
| DR-0010-v1716-01       | DR    | Adopt DESIGN.md ecosystem as archetype + brand dictionary supplier      |
| DR-0010-v1716-02       | DR    | Brand catalog Phase 1 scope = 8 archetypes representative brand only    |
| DR-0010-v1716-03       | DR    | Category system SSOT = templates/04_Sources.md                          |
| OQ-0010-v1716-01 (carried) | OQ | DESIGN.md auto-customization quality (deferred to TDD, carries OQ-0004) |

### Traceability Chain (v1.7.16 additions)

```text
US-0010-0016 -> AC-0010-0019, AC-0010-0020 -> BR-0010-0015, BR-0010-0016, BR-0010-0017 -> EX-0010-0018, EX-0010-0020, EX-0010-0021, EX-0010-0022, EX-0010-0023, EX-0010-0032, EX-0010-0033 -> TC-0010-0031, TC-0010-0032, TC-0010-0033, TC-0010-0034, TC-0010-0035, TC-0010-0036, TC-0010-0037, TC-0010-0046, TC-0010-0047
US-0010-0017 -> AC-0010-0021, AC-0010-0022 -> BR-0010-0013, BR-0010-0014 -> EX-0010-0024, EX-0010-0025, EX-0010-0026, EX-0010-0034 -> TC-0010-0038, TC-0010-0039, TC-0010-0040, TC-0010-0048
US-0010-0018 -> AC-0010-0023 -> BR-0010-0019 -> EX-0010-0027, EX-0010-0028 -> TC-0010-0041, TC-0010-0042
US-0010-0019 -> AC-0010-0024 -> BR-0010-0020 -> EX-0010-0029 -> TC-0010-0043
US-0010-0020 -> AC-0010-0025 -> BR-0010-0018 -> EX-0010-0030, EX-0010-0031 -> TC-0010-0044, TC-0010-0045
US-0010-0021 -> AC-0010-0026 -> BR-0010-0016 -> EX-0010-0032 -> TC-0010-0046
US-0010-0022 -> AC-0010-0020, AC-0010-0027 -> BR-0010-0015 -> EX-0010-0018, EX-0010-0033 -> TC-0010-0032, TC-0010-0047
```

### Rejected

- RJ-0010-v1716-01: Self-contained static YAML brand catalog inside the QFAI package.
  - DO NOT ship the catalog as static YAML.
  - Temptation: zero-network-dependency operation.
  - Reason: DR-0010-v1716-01 — ecosystem delegation prevents catalog rot and duplicated curation.

- RJ-0010-v1716-02: 66-brand full catalog in v1.7.16.
  - DO NOT include 66 brands in this version.
  - Temptation: richer selection surface on day one.
  - Reason: DR-0010-v1716-02 — deferred by D-004; prioritize wiring correctness over catalog breadth.

- RJ-0010-v1716-03: Keep two parallel category taxonomies (04_Sources.md + 20_trend_scan.md).
  - DO NOT maintain both.
  - Temptation: preserve legacy trend_scan layout.
  - Reason: DR-0010-v1716-03 — drift risk; validators read 04_Sources.md per REQ-0015.

### Rationale

The v1.7.16 slice installs the upstream half of the Trend→Axis→Design-System→Prototyping chain inside the discussion skill: Step 11.3 produces the DESIGN.md SSOT (`uiux/12_design_system.md`), Step 11.5 derives TRD-XX axes from Trend Scan entries, and the canonical templates (`04_Sources.md`, `21_design_eval_trend_derived.md`, `12_design_system.md`) carry the traceability fields (`evaluation_connection`, `source_refs`) that spec-0014 validators enforce. Non-UI packs remain untouched (NFR-0007), and AI-only operability (NFR-0008) ensures the full Phase A / Phase B cycle runs without human confirmation steps.

## v1.7.17 (2026-04-18) — Design Guideline Traceability Hardening

### Context

- Source: discussion-20260418170937652
- In-scope REQs for spec-0010 this revision: REQ-0027 (design guideline research step), REQ-0028 (`design_guideline_research` category), REQ-0029 (quantitative score anchor guidance)
- Applicable NFRs: NFR-0012 (guideline flexibility), NFR-0013 (non-UI safety)

### Added

| ID | Layer | Summary |
| -- | ----- | ------- |
| US-0010-0023..0025 | US | guideline research mandatory step, canonical source category, quantitative anchor guidance |
| AC-0010-0028..0030 | AC | workflow presence, source schema, score_anchors proxy requirement |
| BR-0010-0021..0023 | BR | mandatory research, category storage rule, adjective-only anchor prohibition |
| EX-0010-0035..0038 | EX | happy/non-ui/quantitative/negative examples |
| TC-0010-0049..0053 | TC | SKILL/template/non-ui/template guidance coverage |
| DR-0010-v1717-01..03 | DR | upstream obligation, source SSOT, quantitative proxy mandate |

### Rejected

- RJ-0010-v1717-01: Leave guideline research to `/qfai-prototyping`.
  - DO NOT shift this responsibility downstream.
  - Temptation: avoid changing discussion artifacts.
  - Reason: root cause remains unresolved upstream.

- RJ-0010-v1717-02: Store guideline research in a separate file outside `04_Sources.md`.
  - DO NOT create a parallel source registry.
  - Temptation: keep guideline research visually isolated.
  - Reason: parallel taxonomies drift quickly and complicate validation.

- RJ-0010-v1717-03: Allow adjective-only score anchors.
  - DO NOT accept purely qualitative anchor text.
  - Temptation: faster authoring with softer prose.
  - Reason: such anchors cannot support deterministic review or validator messaging.
