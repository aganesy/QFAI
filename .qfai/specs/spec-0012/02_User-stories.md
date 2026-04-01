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
