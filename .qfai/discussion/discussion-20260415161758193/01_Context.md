# 01 Context

## UI-bearing Classification

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces: (none)
- classification_rationale: The subject matter is packages/qfai internal library code (TypeScript runtime, validators, CLI parser). No user-facing UI screens exist. The CLI surface classification applies to user-facing terminal UIs; here the CLI changes are about removing modes from a library API, not about terminal UX design.

## Metadata

| Key           | Value                                 |
| ------------- | ------------------------------------- |
| Discussion ID | discussion-20260415161758193          |
| Date          | 2026-04-15                            |
| Owner         | agent                                 |
| Source        | qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev6.md |

## Goal and Completion Criteria

- Goal: Close all identified contract gaps in `packages/qfai` prototyping subsystem within a single PR, producing a consistent, auditable, and strict full-harness-only / UI-only implementation.
- Measurable completion criteria:
  1. `standard` and `low-cost` modes are rejected at CLI, execution, and validator layers.
  2. `cli`, `api`, `backend` surfaces are rejected from prototyping contract.
  3. `runFullHarness()` resolves calibration pack internally from `calibrationRef.packPath`; caller scalar override is impossible.
  4. `runtimeGate.evidenceRefs` and `specCoverage.evidenceRefs` contain only concrete artifact refs.
  5. `reviewerSignoff.status` and `reviewerLogs[].verdict` use the declared vocabulary with correct semantics.
  6. `uiFidelityBuilder` matches observations by `screenId` (not `uiContractId`).
  7. Package shipped docs, assets, and tests contain no stale mode/surface references.
  8. All vitest test suites pass.

## Stakeholders

- Primary stakeholders: QFAI package maintainers, implementors working on v1.7.15 PR
- Secondary stakeholders: QFAI downstream users (informed via updated shipped docs)

## Background

- Business context: QFAI v1.7.15-06 audit identified 5 contract contradictions in the prototyping subsystem that prevent the package from being considered complete. A single PR must resolve all 5 simultaneously with no backward compat concerns.
- Technical context: The `packages/qfai` prototyping subsystem has accumulated technical debt across mode.ts, execution.ts, harness/runtime.ts, validators/prototypingEvidence.ts, and related files. The root cause is that contracts were extended piecemeal without removing old semantics.
- Historical context: Design evolved through rev1→rev6. Each revision narrowed scope. Rev6 is the final specification locked for implementation.

## Inputs

- Existing repository facts: `packages/qfai/src/core/prototyping/`, `packages/qfai/src/core/harness/`, `packages/qfai/src/core/validators/prototypingEvidence.ts`, `packages/qfai/src/cli/commands/prototyping.ts`
- External references: Design document rev6 (SRC-0001), canonical unified requirements spec (SRC-0002), v1.7.15-06 audit report (SRC-0003)
- Assumptions: Backward compatibility is explicitly abandoned. No migration tooling required. Single PR delivery.

## Key Issues

- Issue 1: prototyping mode contract self-contradicts (`standard` allowed by validator but runtime requires full-harness evidence)
- Issue 2: `cli` surface remains in type definitions, docs, and tests despite being non-prototypable
- Issue 3: `runFullHarness()` accepts caller-supplied scalar thresholds, allowing threshold override
- Issue 4: `runtimeGate.evidenceRefs` and `specCoverage.evidenceRefs` contain self-references and synthetic strings that cannot be audited
- Issue 5: `reviewerSignoff.status = approved` is set for plateau/maxIterations terminations, contradicting audit requirements
- Issue 6 (minor): `uiFidelityBuilder` matches `obs.screenId === screen.uiContractId` instead of `screen.screenId`
