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
