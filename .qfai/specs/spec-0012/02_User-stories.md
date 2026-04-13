# 02 User Stories

## US-0012-0001: All-Spec Prototyping

As a developer, I want `/qfai-prototyping` to build minimum runnable skeletons for ALL specs, so that `/qfai-atdd` can proceed without hidden scope gaps.

## US-0012-0002: Spec Auto-Discovery

As a developer, I want the skill to detect changed specs via 4-source diff (branch, local, evidence mtime, delta.md), so that only relevant specs are flagged for attention while all specs remain in scope.

## US-0012-0003: Mode Selection

As a developer, I want to choose between low-cost, standard (default), and full-harness prototyping modes, so that I can balance verification depth with execution time.

## US-0012-0004: Coverage Matrix Generation

As a QA engineer, I want a Coverage Matrix for all specs showing uiRoutes, apiEndpoints, and dbObjects counts, so that scope completeness is visible.

## US-0012-0005: Runtime Gate v2

As a QA engineer, I want UI route, API endpoint, DB object, and mock path checks for all declared items, so that runtime integrity is verified before acceptance testing.

## US-0012-0006: Non-UI Project Handling

As a QFAI user working on a CLI/API project, I want non-UI surfaces to skip UI route checks and visual fidelity gates, so that prototyping obligations match the project surface type.

## US-0012-0007: Full-Harness Workflow

As a developer, I want an opt-in full-harness mode with Planner -> Generator -> Evaluator -> Decision Gate loop, so that runtime-heavy verification can be performed when needed.

## US-0012-0008: Skill-Centered Prototyping Truth

As a QFAI maintainer, I want spec, policies, docs, and code to unanimously agree that `/qfai-prototyping` skill is the sole prototyping interface (no CLI command), so that contributors never encounter contradictory guidance about how to invoke prototyping.

## US-0012-0009: Superseded CLI Reference Elimination

As a QFAI maintainer, I want all active documents that previously referenced `qfai prototyping` CLI command to be archived or corrected, so that no document misleads users into attempting a removed command.

## US-0012-0010: Static-First Mode-Aware Contract Normalization

As a developer, I want the prototyping skill contract to declare static-first as default with mode-aware sections, so that the contract is the single source of truth for mode behavior and consumers need not consult policies.

## US-0012-0011: Prototyping Mode Module

As a QFAI developer, I want a dedicated prototyping mode module (`prototyping/mode.ts`) that resolves the effective prototyping mode through existence-based precedence (user-specified > discussion recommendation > system default), so that mode resolution is deterministic, traceable, and centralized.

## US-0012-0012: Recommendation Artifact Resolution

As a QFAI developer, I want `resolveLatestRecommendationArtifact()` to be the single source of truth for recommendation artifact status (valid/invalid/missing/no-pack), so that report.ts and prototypingEvidence.ts consumers do not duplicate artifact-status logic.

## US-0012-0013: Existence-Based Precedence

As a QFAI user, I want prototyping.yaml mode resolution to use key existence (not value validity) for namespaced vs legacy precedence, so that a malformed namespaced block produces an explicit error instead of silently falling back to legacy.

## US-0012-0014: Prototyping Obligation Matrix

As a QFAI developer, I want `derivePrototypingObligations(surface, mode)` to map (surface, effectiveMode) to the obligation matrix
(requireRuntimeGate, requireUiFidelity, requireRenderBundle, requireBrowserQaBundle, requireFullHarness),
so that obligations are derived programmatically rather than hardcoded in multiple consumers.

## US-0012-0015: Prototyping Calibration Config

As a QFAI user, I want `qfai.config.yaml` to support a `prototyping.calibration` stanza with accept/refine thresholds, maxIterations, plateauDelta, and plateauLookback, so that full-harness calibration can be tuned per project.

## US-0012-0016: Report Prototyping Observability

As a project lead, I want report.ts to collect prototyping data (mode, evidence, harness, render, browserQa, calibration) into a `## Prototyping` section, so that prototyping state is visible in reports even when not yet used as a blocking gate.

## US-0012-0017: Canonical Prototyping Surfaces

As a QFAI user, I want prototyping surfaces to use canonical names (web/mobile/desktop/cli/mixed) without the -ui suffix, so that surface identifiers are concise and consistent across all QFAI modules.

## US-0012-0018: Execution Hard Gates for Invalid Input

As a QFAI developer, I want execution.ts to hard-reject invalid classification, invalid recommendation artifacts, and non-UI packs at the entry gate, so that no prototyping execution proceeds with semantically invalid inputs.

## US-0012-0019: Namespaced-Only prototyping.yaml Schema

As a QFAI user, I want prototyping.yaml to require the namespaced `prototyping:` block exclusively, with legacy top-level keys hard-rejected, so that there is only one valid schema format and no migration ambiguity.

## US-0012-0020: Semantic Invariant Shared Across All Layers

As a QFAI developer, I want the recommended_mode ∈ allowed_modes invariant to be enforced by a single shared helper (recommendationSemantics.ts) at all layers (parser, resolver, execution, CLI, validator, preflight), so that semantic mismatch is never silently accepted at any layer.

## US-0012-0021: Classification-Aware Evidence Obligations

As a QFAI developer, I want obligation derivation to distinguish "discussion UI-bearing" (includes cli) from "visual/browser evidence required" (excludes cli), so that cli-surface packs are not incorrectly required to produce browser screenshots or Playwright-based evidence.

## US-0012-0022: Full-Harness Iteration Protocol

As a developer, I want full-harness mode to execute a multi-iteration improvement loop (Evaluate→Identify→Fix→Re-evaluate) with configurable termination conditions (converged/max-iterations/plateau/manual-stop), so that prototyping quality is iteratively refined rather than accepted in a single pass.

## US-0012-0023: Independent Evaluator Panel

As a developer, I want full-harness evaluation to be performed by an independent 3-layer panel (product-surface-reviewer for design quality, product-experience-architect for product experience, qa-gatekeeper for process audit), so that self-evaluation bias is structurally prevented.

## US-0012-0024: Score Scope Separation

As a developer, I want discussion 3-layer scores (design direction quality) to be explicitly separated from prototyping scoringTrace (implementation fidelity), so that scores from different evaluation contexts are never confused or copied between phases.

## US-0012-0025: Full-Harness Validator Rules

As a QFAI developer, I want prototypingEvidence.ts to include QFAI-PROT-290~294 validator rules checking iteration integrity
(single-iteration convergence, scoringTrace count, terminationReason cross-check, maxIterations cap, score progression),
so that full-harness evidence quality is automatically verified.

## US-0012-0026: Full-Harness Real Convergence (v1.7.15)

As a developer, I want a full-harness run with real reviewer and calibration data to converge only after at least 2 iterations with real panel scoring (weightedTotal = min(L1, L2)), so that single-iteration convergence and zero-seeded scores are structurally impossible.

## US-0012-0027: Missing Evidence Fail-Fast (v1.7.15)

As a developer, I want missing evidence (reviewer identity, commitSha, calibration pack, render evidence, browser QA evidence, ui observation input, spec coverage input) to cause an immediate runtime error without silent fallback, so that the pipeline never produces partially-grounded results.

## US-0012-0028: Evidence Grounding Integrity (v1.7.15)

As a QA engineer, I want specCoverage to be derived from real spec/runtime diffs and uiFidelity to reject synthetic or zero-seeded values (including auto-generated mockPaths.status="pass"), so that evidence artifacts reflect actual implementation state.

## US-0012-0029: Docs-Runtime Reality Sync (v1.7.15)

As a QFAI maintainer, I want docs/SKILL/README claims about full-harness input requirements, reviewer mandatory status, convergence rules, specCoverage measurement, uiFidelity observation-only constraints, and calibration necessity to match the actual runtime failure conditions, so that documentation never overstates or understates what the system enforces.
