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

## Rejected

- RJ-0010-0001: Figma integration
  - DO NOT add Figma/Sketch tool dependencies
  - Temptation: adding external design tool APIs for richer mocks
  - Reason: QFAI is tool-independent; HTML+CSS mocks are self-contained

- RJ-0010-0002: Generic SaaS card grid as default template
  - DO NOT use generic card grid patterns as defaults
  - Temptation: using common SaaS patterns for quick starts
  - Reason: per DR-0032, generic patterns are banned to enforce design intentionality

## ID Renumbering

| Old ID | New ID | Notes |
| ------ | ------ | ----- |
| spec-0019 US/TC/BR | US-0010-YYYY / TC-0010-YYYY / BR-0010-YYYY | DDP parts |
| spec-0020 US/TC | US-0010-YYYY / TC-0010-YYYY | Navigation parts |
| spec-0021 US/TC | US-0010-YYYY / TC-0010-YYYY | Render Critique parts |
| spec-0022 US/TC | US-0010-YYYY / TC-0010-YYYY | Fidelity parts |
| spec-0025 US/TC | US-0010-YYYY / TC-0010-YYYY | Design Audit parts |
