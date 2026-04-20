# 02 User Stories

## US-0010-0001: Unified Discussion Pack Generation

As a QFAI user, I want a single `/qfai-discussion` command to produce a complete 15-file discussion pack, so that requirements, OQs, and decisions are captured in one structured workflow.

## US-0010-0002: Inception Deck for Ambiguity Removal

As a product owner, I want the Inception Deck (10 questions) to surface and resolve project ambiguities early, so that downstream SDD starts without hidden assumptions.

## US-0010-0003: Story Workshop with Visual Artifacts

As a QFAI user, I want the Story Workshop to produce user stories, user flows with Mermaid diagrams, and optionally HTML+CSS mocks as reference material for UI stories, so that stakeholders can validate requirements visually.

## US-0010-0004: Example Mapping with 6 Perspectives

As a QA engineer, I want Example Mapping to cover 6 mandatory perspectives (happy, negative, edge, permission, state transition, idempotency) for each BR/AC candidate, so that edge cases are captured early.

## US-0010-0005: OQ-Driven Discussion Exit

As a project lead, I want discussion to block completion until all OQs are resolved (open count = 0), so that no ambiguities leak into SDD.

## US-0010-0006: DDP for UI-Bearing Projects

As a QFAI user, I want Design Direction Pack (DDP) authoring for UI-bearing projects with theme, mood, CTA hierarchy, and anti-goals, so that UI implementation has clear design intent.

## US-0010-0007: UI-Bearing Detection and Sidecar Generation

As a QFAI user, I want automatic UI-bearing detection based on surface type classification and canonical 3-layer sidecar generation, so that UI-specific artifacts are produced using the current evaluation model.

## US-0010-0008: 12-Reviewer RCP Execution

As a QFAI user, I want the full 12-reviewer Review Cycle Protocol (10 standard + devils-advocate + pattern-doubler) executed for each review cycle, so that discussion quality is independently verified.

## US-0010-0009: SKILL.md Rewrite for 3-Layer Canonical Model

As a QFAI user, I want the qfai-discussion SKILL.md to teach the canonical 3-layer evaluation model (invariant / trend-derived / product-specific) exclusively, so that agents produce only the current template family without legacy 4-axis references.

## US-0010-0010: 3-Layer Template Family Replacement

As a QFAI user, I want `qfai init` to generate the 3-layer template family only (no 4-axis files 20–23), so that new projects start with the canonical evaluation model from day one.

## US-0010-0011: Canonical Sidecar Index and Strategy Upgrade

As a QFAI user, I want `00_index.md` to list only the canonical 3-layer family and `10_implementation_strategy.md` to enforce a strong schema (surface classification, strategy, rationale), so that the sidecar manifest and strategy are always structurally valid.

## US-0010-0012: Sources Template Trend Translation

As a QFAI user, I want `04_Sources.md` to support trend evaluation with `source_translation` linking competitive findings to trend-derived axes, so that evaluation criteria are traceable to research.

## US-0010-0013: HTML/CSS Mock Demotion to Optional

As a QFAI user, I want HTML/CSS visual mocks demoted from required completion gate to optional/fallback reference material, so that discussion completion is not blocked by CSS generation quality.

## US-0010-0014: Contracts Template Screen-Obligation Schema

As a QFAI user, I want `40_screen_contracts.md` to enforce a screen-obligation schema (screen ID, obligations, secondary_tasks, acceptance signals), so that design contracts are machine-verifiable.

## US-0010-0015: Prototyping Recommendation Artifact

As a discussion facilitator, I want the discussion workflow to produce a `prototyping.yaml` side artifact with mode recommendation, rationale, allowed modes, and surface classification, so that the prototyping skill has a structured input for mode resolution.

## US-0010-0016: Step 11.3 Brand→Aesthetic Mapping DESIGN.md 自律生成 (v1.7.16)

As a discussion facilitator, I want Step 11.3 to autonomously select a representative brand archetype from the taste interview and then customize it into `uiux/12_design_system.md` (8 sections), so that UI-bearing packs receive an executable DESIGN.md without human intervention.

## US-0010-0017: Step 11.5 Trend→Axis Derivation (v1.7.16)

As a discussion facilitator, I want Step 11.5 to derive `21_design_eval_trend_derived.md` axes from `04_Sources.md` Trend Scan entries, with at least one visual axis when visual categories exist, so that evaluation criteria are traceable to competitive research.

## US-0010-0018: 04_Sources.md evaluation_connection Field (v1.7.16)

As a QFAI user, I want every Trend Scan entry in `04_Sources.md` (all 6 visual categories) to include an `evaluation_connection` field pointing to a `TRD-XX` axis, so that trend-to-axis traceability can be automatically validated.

## US-0010-0019: 21_design_eval_trend_derived.md Visual Axis Examples (v1.7.16)

As a QFAI user, I want `templates/uiux/21_design_eval_trend_derived.md` to show at least two visual axis examples (e.g., Visual Warmth & Color Harmony) plus `source_refs` guidance, so that authors have a concrete template for deriving visual axes.

## US-0010-0020: Sidecar Generation Flow Step 1c → Step 1d Ordering (v1.7.16)

As a discussion facilitator, I want the Sidecar Generation Flow to enforce Step 1c (Trend Scan creation) before Step 1d (trend-derived axis derivation), with no parallel execution, so that trend axes have complete Trend Scan input.

## US-0010-0021: Brand Catalog for AI Autonomous Selection (v1.7.16)

As a discussion facilitator, I want a `references/design-md-brand-catalog.md` file containing 8 archetypes (Elegant Minimalist, Bold & Dynamic, Warm Organic, Technical Precision, Playful Creative, Trustworthy Professional, Futuristic Innovation, Heritage Classic) with representative brand + aesthetic fields, so that the AI can score and select an archetype from the taste interview input.

## US-0010-0022: 12_design_system.md Template 8-Section Schema (v1.7.16)

As a QFAI user, I want `templates/uiux/12_design_system.md` to define 8 sections (Visual Theme / Color Palette / Typography / Spacing & Layout / Component Style / Animation & Motion / Do's and Don'ts / Agent Implementation Guide), so that auto-generated DESIGN.md files have a uniform structure that downstream agents can consume.

## US-0010-0023: UI-bearing design guideline research mandatory step (v1.7.17)

As a discussion facilitator, I want UI-bearing discussion runs to research external design guidelines such as Material Design, WCAG, Apple HIG, and adopted UI-library guidance before finalizing Trend Scan, so that downstream evaluation criteria are grounded in concrete design standards rather than taste alone.

## US-0010-0024: `design_guideline_research` canonical source category (v1.7.17)

As a QFAI user, I want `04_Sources.md` to include a `design_guideline_research` category with traceable entries, so that guideline findings are stored in the same canonical source registry as trend and competitive research.

## US-0010-0025: Trend-derived score anchors require quantitative proxy (v1.7.17)

As a QFAI user, I want `uiux/21_design_eval_trend_derived.md` authoring guidance to require quantitative proxy in `score_anchors`, so that axis scoring cannot rely on abstract adjectives alone.
