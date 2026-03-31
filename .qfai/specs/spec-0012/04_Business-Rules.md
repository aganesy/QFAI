# 04 Business Rules

## BR-0012-0001: CLI Command Removed

- The CLI command `qfai prototyping` has been REMOVED from the codebase.
- This spec covers the `/qfai-prototyping` SKILL only.

## BR-0012-0002: All-Spec Scope

- Scope is fixed to ALL specs from `.qfai/specs/spec-*`; do not shrink to one spec.

## BR-0012-0003: Contracts Are Strict Inputs

- Contracts are strict inputs in this stage. Do not create new files under `.qfai/contracts/**`.
- If any spec has zero resolved contracts, STOP and route back to `/qfai-discussion`.

## BR-0012-0004: Mode Precedence

- Mode selection follows: user-specified > discussion recommendation > system default (standard).
- Full-harness is never auto-activated.

## BR-0012-0005: Fidelity DoD

- L1 (skeleton): route-level rendering exists for declared primary screens.
- L2 (interactive, default): declared primary interactions wired with mockable behavior; mock path recorded.

## BR-0012-0006: Evidence Dual Artifacts

- Both markdown and JSON evidence artifacts are mandatory under `.qfai/evidence/`.
- JSON must include `uiFidelity` for L2 reporting.

## BR-0012-0007: No ATDD/TDD in This Stage

- Do not add ATDD or TDD automation in this stage.
