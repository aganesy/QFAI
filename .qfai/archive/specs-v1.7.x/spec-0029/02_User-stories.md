# 02 User Stories

## US Catalog

- US-0029-0001: Critique Provider Interface Definition
- US-0029-0002: Generic Command Provider
- US-0029-0003: Example Provider Implementations
- US-0029-0004: Fail-Open Critique Handling
- US-0029-0005: 3-Layer Evaluation Architecture Reconciliation (v1.7.6 Remediation)

## US-0029-0001: Critique Provider Interface Definition

- Parent: CAP-0029
- Goal: Define a provider interface that external critique services can implement
- Non-goals: Implementing specific providers, benchmarking providers
- Notes: Interface must support structured response schema (REQ-0004)

## US-0029-0002: Generic Command Provider

- Parent: CAP-0029
- Goal: Implement a provider that executes external commands to obtain critique
- Non-goals: GUI for command configuration, interactive command execution
- Notes: Must sanitize arguments against injection (POL-001, TC-63)

## US-0029-0003: Example Provider Implementations

- Parent: CAP-0029
- Goal: Provide at least 2 example providers demonstrating the interface
- Non-goals: Production-quality providers, provider marketplace
- Notes: Examples serve as reference implementations for third-party providers

## US-0029-0004: Fail-Open Critique Handling

- Parent: CAP-0029
- Goal: Ensure provider failures never block the prototyping workflow
- Non-goals: Automatic failover between providers, retry logic
- Notes: Failure logged as warning, evaluator continues without critique (NFR-0002)

## US-0029-0005: 3-Layer Evaluation Architecture Reconciliation (v1.7.6 Remediation)

- Parent: CAP-0029
- Source: discussion-20260329195516830, DR-0080, REQ-0004 (global)
- Goal: As a QFAI maintainer, I want the evaluation architecture reconciled to the 3-layer model (invariant, trend-derived, product-specific) so that the critique adapter produces scores aligned to the agreed architecture rather than the legacy 4-axis model.
- Non-goals: Retiring the 4-axis model in non-evaluation code; calibration pack alignment (spec-0030); benchmarking (deferred OQ-0003)
- Notes: DR-0080 mandates convergence to 3-layer model. Legacy 4-axis (usability, consistency, accessibility, delight) must not be used as the scoring architecture. Existing critique data must be re-mappable without data loss per SD-0029-004.

### Example Seeds

| Perspective         | Example                                                                                          | Status |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| Happy path          | Evaluation runs using 3-layer model; invariant, trend-derived, and product-specific scores align | seed   |
| Negative path       | Calibration pack references a 4th axis not defined in architecture; validation rejects           | seed   |
| Edge / boundary     | Score falls exactly on layer boundary threshold; layer assignment is deterministic               | seed   |
| Permission / role   | Maintainer updates scoring rubric; changes require spec-level traceability                       | seed   |
| State transition    | Architecture migrates from ad-hoc to 3-layer; existing scores re-mapped without data loss        | seed   |
| Idempotency / retry | Same input scored twice; identical layer assignments and scores                                  | seed   |
