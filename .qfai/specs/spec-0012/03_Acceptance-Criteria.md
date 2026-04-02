# 03 Acceptance Criteria

## AC-0012-0001: All Specs in Coverage Matrix

Given specs in `.qfai/specs/spec-*`, when prototyping runs, then every spec has a row in the Coverage Matrix.

## AC-0012-0002: 4-Source Diff Detection

Given changed spec files, when Spec Auto-Discovery runs, then changed specs are detected from branch diff, local changes, evidence mtime, and delta.md (union logic).

## AC-0012-0003: Default Mode Is Standard

Given no explicit mode selection, when prototyping runs, then standard mode is used (static + optional light validation, no runtime required).

## AC-0012-0004: Full-Harness Opt-In Only

Given no explicit mode selection, when prototyping runs, then full-harness mode is NOT activated. Full-harness requires explicit user opt-in.

## AC-0012-0005: API Gate Zero 404

Given declared API endpoints, when Runtime Gate v2 checks them, then zero 404 results are produced (stub handlers are acceptable).

## AC-0012-0006: Placeholder Pages Marked REVISE

Given a page with only placeholder content (lorem ipsum, single static string), when the reviewer evaluates, then it is marked REVISE.

## AC-0012-0007: Non-UI Skips UI Obligations

Given a project with `surface: non-ui`, when prototyping runs, then UI route checks, screen rendering, and visual fidelity gates are skipped.

## AC-0012-0008: Evidence Artifacts Produced

Given prototyping completion, when evidence is checked, then both markdown and JSON artifacts exist under `.qfai/evidence/` with uiFidelity for L2.

## AC-0012-0009: Full-Harness Loop Convergence

Given full-harness mode, when the workflow loop runs, then it converges when all dimension floors are met and aggregate score exceeds threshold, or terminates at max iterations.

## AC-0012-0010: No Active Document References CLI Command

Given active documents (specs, policies, README, SKILL.md, CHANGELOG), when searched for `qfai prototyping` as a valid CLI invocation, then zero matches are found. Archived/superseded content is exempt if clearly labelled.

## AC-0012-0011: Skill Contract Is SSOT for Prototyping Interface

Given the prototyping skill contract (`SKILL.md`), when its interface section is inspected, then it declares `/qfai-prototyping` as the sole invocation method and contains no CLI command fallback.

## AC-0012-0012: Static-First Mode-Aware Contract Normalized

Given the prototyping skill contract, when its mode section is inspected, then it declares static-first (standard) as default, documents all three modes with their obligations, and does not delegate mode definitions to external policies.
