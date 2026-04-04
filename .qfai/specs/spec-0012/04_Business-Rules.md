# 04 Business Rules

## BR-0012-0001: CLI Command Removed

- AC-Refs: AC-0012-0001

- The CLI command `qfai prototyping` has been REMOVED from the codebase.
- This spec covers the `/qfai-prototyping` SKILL only.

## BR-0012-0002: All-Spec Scope

- AC-Refs: AC-0012-0002

- Scope is fixed to ALL specs from `.qfai/specs/spec-*`; do not shrink to one spec.

## BR-0012-0003: Contracts Are Strict Inputs

- AC-Refs: AC-0012-0003

- Contracts are strict inputs in this stage. Do not create new files under `.qfai/contracts/**`.
- If any spec has zero resolved contracts, STOP and route back to `/qfai-discussion`.

## BR-0012-0004: Mode Precedence

- AC-Refs: AC-0012-0004

- Mode selection follows: user-specified > discussion recommendation > system default (standard).
- Full-harness is never auto-activated.

## BR-0012-0005: Fidelity DoD

- AC-Refs: AC-0012-0005

- L1 (skeleton): route-level rendering exists for declared primary screens.
- L2 (interactive, default): declared primary interactions wired with mockable behavior; mock path recorded.

## BR-0012-0006: Evidence Dual Artifacts

- AC-Refs: AC-0012-0006

- Both markdown and JSON evidence artifacts are mandatory under `.qfai/evidence/`.
- JSON must include `uiFidelity` for L2 reporting.

## BR-0012-0007: No ATDD/TDD in This Stage

- AC-Refs: AC-0012-0007

- Do not add ATDD or TDD automation in this stage.

## BR-0012-0008: No CLI Command References in Active Documents

- AC-Refs: AC-0012-0010

- No active document (spec, policy, README, SKILL.md, CHANGELOG) may reference `qfai prototyping` as a valid CLI command.
- Superseded content that mentions the CLI command must be clearly labelled as archived/superseded (e.g., `[SUPERSEDED v1.7.12]`).
- If a reference is found during review, it must be corrected before the spec is marked DONE.

## BR-0012-0009: Skill Contract Is SSOT

- AC-Refs: AC-0012-0011

- The prototyping skill contract (`SKILL.md`) is the single source of truth for the prototyping interface.
- No other document may define an alternative invocation path (CLI command, direct script, etc.) for prototyping.
- Responsibility boundary: the skill contract owns interface definition; policies own quality gates and NFRs.

## BR-0012-0010: Static-First Mode-Aware Contract

- AC-Refs: AC-0012-0012

- The skill contract must declare static-first (standard) as the default mode.
- All three modes (low-cost, standard, full-harness) must be documented in the contract with their obligations and triggers.
- Mode definitions must not be split across policies; the contract is self-contained for mode behavior.

## BR-0012-0011: Mode Resolution Precedence

- AC-Refs: AC-0012-0013

- Mode resolution follows strict precedence: explicit user request > discussion-pack recommendation > system default (standard)
- resolvePrototypingMode() implements this precedence chain
- If mode is outside allowed_modes, QFAI-PROT-236 warning is emitted but mode is still applied

## BR-0012-0012: Existence-Based Precedence (D-5)

- AC-Refs: AC-0012-0014

- If the `prototyping` key exists at any level in prototyping.yaml (even as a scalar), the namespaced contract is authoritative
- hasNamespacedRecommendationBlock() checks key existence only, not value validity
- Non-object namespaced block is a hard error with no legacy fallback
- Deprecated top-level schema emits QFAI-PROT-231 (warning)
- Namespaced vs top-level conflict emits QFAI-PROT-232 (warning)

## BR-0012-0013: Recommendation Artifact Resolution

- AC-Refs: AC-0012-0015

- resolveLatestRecommendationArtifact() returns { status, path, recommendation, warnings }
- status values: "valid" (parseable + required fields), "invalid" (exists but malformed), "missing" (pack exists but no file), "no-pack" (no discussion-pack)
- All consumers (report.ts, prototypingEvidence.ts) MUST use this resolver

## BR-0012-0014: Obligation Matrix Derivation

- AC-Refs: AC-0012-0016, AC-0012-0017

- derivePrototypingObligations(surface, mode) maps to boolean flags
- Non-UI surfaces skip: requireUiFidelity=false, requireRenderBundle=false, requireBrowserQaBundle=false
- Full-harness mode adds: requireFullHarness=true
- Low-cost mode reduces: requireRuntimeGate=false (static only)

## BR-0012-0015: Calibration Config Normalization

- AC-Refs: AC-0012-0018

- normalizePrototypingCalibration() provides defaults for all fields
- readRatio() for accept/refine (0.0-1.0), readPositiveInt() for maxIterations, readNonNegativeNumber() for plateauDelta/plateauLookback
- Invalid values are replaced with defaults (not errors)
