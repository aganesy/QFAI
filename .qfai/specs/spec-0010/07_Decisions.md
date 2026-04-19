# 07 Decisions

## SD-0010-0001: 3-Layer Canonical Model Replaces 4-Axis

- Policy-Ref: DR-0106
- Discussion-Ref: discussion-20260401215536131 D-001, D-004
- Date: 2026-04-01
- Status: Adopted

The old 4-axis evaluation model (usability / consistency / accessibility / delight as separate template files 20–23) is replaced by the 3-layer model (invariant / trend-derived / product-specific).
Old 4-axis files are removed from `qfai init` defaults and `00_index.md` manifest.
The warning-only migration window is closed; stale 4-axis artifacts now fail with explicit canonical migration errors, and v1.7.12 ensures new generation never produces legacy files.

Rationale: The 3-layer model is evaluation-theory-grounded and avoids the overlap between the old axes (e.g., accessibility was both invariant and product-specific). Consolidation into layers enables trend-derived evaluation sourced from competitive research.

## SD-0010-0002: HTML/CSS Mock Demoted to Optional/Fallback

- Policy-Ref: DR-0107
- Discussion-Ref: discussion-20260401215536131 D-002
- Date: 2026-04-01
- Status: Adopted

HTML/CSS visual mocks are no longer a required completion artifact. They may still appear in `03_Story-Workshop.md` as optional reference material but must not gate discussion completion or trigger validation errors when absent.

Rationale: Visual layout belongs to discussion-phase taste interviews and design contracts, not to spec completion conditions. Mandatory CSS generation created false gating when AI-generated CSS quality was insufficient, blocking otherwise complete discussions.

## DR-0010-v1716-01: Adopt DESIGN.md Ecosystem as Archetype + Brand Dictionary Supplier

- Discussion-Ref: discussion-20260418093755100 (D-002)
- Date: 2026-04-18
- Status: Adopted

Decision: Step 11.3 (Brand→Aesthetic Mapping) consumes the awesome-design-md / `npx getdesign@latest` ecosystem as the canonical source of brand archetype + aesthetic dictionaries. Phase A archetype selection draws from this ecosystem's catalog; Phase B customization instantiates one archetype into `uiux/12_design_system.md`.

Context: Discussion pack D-002 evaluated three archetype-dictionary options (build from scratch / static YAML catalog / DESIGN.md ecosystem). The ecosystem option is already community-maintained, ships representative brand mappings, and is npx-consumable — avoiding duplicated curation inside the QFAI package.

Rationale: Delegates brand-catalog curation to an external maintained ecosystem so the QFAI package stays focused on the discovery-to-prototyping pipeline. Online-only operation is acceptable per NFR-0011.

Rejected:

- DO NOT ship a self-contained static YAML brand catalog inside the QFAI package.
  - Temptation: zero-network-dependency operation.
  - Reason: catalog rot; duplicating an ecosystem slower than upstream.
- DO NOT build a bespoke archetype dictionary from zero.
  - Temptation: full control over archetype definitions.
  - Reason: opportunity cost; the ecosystem already provides eight industry-recognized archetypes.

## DR-0010-v1716-02: Brand Catalog Phase 1 Scope = 8 Archetypes Representative Brands Only

- Discussion-Ref: discussion-20260418093755100 (D-004)
- Date: 2026-04-18
- Status: Adopted

Decision: v1.7.16 ships `references/design-md-brand-catalog.md` populated with exactly the 8 archetypes (Elegant Minimalist, Bold & Dynamic, Warm Organic, Technical Precision, Playful Creative, Trustworthy Professional, Futuristic Innovation, Heritage Classic) each with one representative brand. The full 66-brand catalog is deferred to a later version.

Rationale: 8 archetypes are sufficient to exercise Phase A selection logic and cover the top-level brand personality axes. Expanding to 66 brands adds curation load without proportional selection quality in v1.7.16's AI-only selection path.

Rejected:

- DO NOT ship the 66-brand catalog in v1.7.16.
  - Temptation: richer selection surface on day one.
  - Reason: deferred by D-004; prioritize ecosystem-wiring correctness over catalog breadth.

## DR-0010-v1716-03: Category System SSOT = templates/04_Sources.md

- Discussion-Ref: discussion-20260418093755100 (D-007)
- Date: 2026-04-18
- Status: Adopted

Decision: The single source of truth for Trend Scan category taxonomy (color, typography, visual motif, spacing, shape, imagery) is `templates/04_Sources.md`. Legacy `templates/uiux/20_trend_scan.md` is consolidated into this SSOT; 04_Sources.md carries the `evaluation_connection` field on every category.

Rationale: Two parallel category taxonomies caused drift (discussion-20260418093755100 D-007). Unifying under 04_Sources.md simplifies validator wiring (UIX-VAL-T01..T04 read a single file) and honors NFR-0009 package independence (changes stay inside `packages/qfai/`).

Rejected:

- DO NOT keep two parallel category systems (04_Sources.md + 20_trend_scan.md).
  - Temptation: preserve the legacy trend_scan layout for readability.
  - Reason: drift risk; validators already read 04_Sources.md per REQ-0015.

## DR-0010-v1717-01: Design guideline research is an upstream discussion obligation

- Discussion-Ref: discussion-20260418170937652 (DR-001)
- Date: 2026-04-18
- Status: Adopted

Decision: UI-bearing discussion runs MUST perform design guideline research before locking trend-derived axes. The requirement is upstream and belongs to `/qfai-discussion`, not to `/qfai-prototyping`.

Rationale: the failure mode reported in the source discussion is caused by missing upstream criteria, not by downstream prototype execution. Root cause must be closed at discussion time.

## DR-0010-v1717-02: `design_guideline_research` is stored in `04_Sources.md`

- Discussion-Ref: discussion-20260418170937652 (DR-002)
- Date: 2026-04-18
- Status: Adopted

Decision: guideline research uses `04_Sources.md` as its canonical storage surface via a `design_guideline_research` category rather than a new file.

Rationale: a single source registry keeps traceability simple for both SDD and validation.

## DR-0010-v1717-03: Quantitative proxy is mandatory in TRD score anchors

- Discussion-Ref: discussion-20260418170937652 (DR-003)
- Date: 2026-04-18
- Status: Adopted

Decision: trend-derived `score_anchors` must include quantitative proxy in low/mid/high anchor text. Adjective-only anchors are explicitly rejected.

Rationale: design review scoring must be explainable and testable; pure adjectives are too weak to block low-quality UI.
