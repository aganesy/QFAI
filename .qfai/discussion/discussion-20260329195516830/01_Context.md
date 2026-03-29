# 01 Context

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329195516830 |
| Date          | 2026-03-29                   |
| Owner         | agent                        |
| Source        | qfai_v1.7.6_issue_register_and_remediation_plan.md |

## Goal and Completion Criteria

**Goal**: Execute a targeted correction pass to fix user-facing architectural contradictions and reconcile internal mismatches identified in the static repository audit of QFAI v1.7.6.

The overall assessment is that the repository is implementation-rich, workflow-incomplete, and internally inconsistent in critical places. The next step is a targeted correction pass, not a full redesign.

**Completion Criteria**:

1. All P0 issues (prototyping static-first default, full-harness dedicated entrypoint) are resolved.
2. All P1 issues (3-layer vs 4-axis reconciliation, strategy artifact upgrade, screen contract upgrade, UI-bearing detection unification, render evidence wiring, browser QA completion, mode split exposure) are resolved.
3. All P2 issues (repo state normalization, workflow docs, migration support) are resolved.
4. `qfai validate` passes with `--fail-on error`.

## Stakeholders

| Role      | Who                                                         |
| --------- | ----------------------------------------------------------- |
| Primary   | QFAI package maintainers and contributors                   |
| Secondary | QFAI end users (developers using the CLI for spec-driven development) |

## Background

- **Business**: QFAI is a specification-driven development verification framework and CLI. v1.7.6 was audited and found to have user-facing contradictions that undermine the intended workflow.
- **Technical**: The repository has substantial internal modules (harness, critique, calibration, observability, handoff, detection) but the user-facing skill/CLI/workflow layer is often incomplete or aligned to older designs. The surface type is non-UI (CLI tool / verification framework).
- **Historical**: Real project feedback surfaced issues with environment dependence, wasted context, phase overlap, and delayed prototyping progress. These observations motivated the static audit that produced the remediation plan.

## Inputs

| Input                                                    | Location / Reference                |
| -------------------------------------------------------- | ----------------------------------- |
| Static audit results and remediation plan                | `qfai_v1.7.6_issue_register_and_remediation_plan.md` |
| Repository source code                                   | `packages/qfai/src/`               |
| Existing skills                                          | `.qfai/assistant/skills/`           |
| Existing steering docs                                   | `.qfai/assistant/steering/`         |

## Key Issues

13 issues were identified in the static audit, organized by priority tier.

### P0 -- Critical (user-facing contradictions)

| ID    | Summary |
| ----- | ------- |
| P0-01 | `qfai-prototyping` uses a runtime-heavy default contract; should default to static-first. |
| P0-02 | No dedicated `/qfai-prototyping-full-harness` entrypoint exists for the full-harness workflow. |

### P1 -- High (architectural mismatches)

| ID    | Summary |
| ----- | ------- |
| P1-01 | 3-layer evaluation architecture documented in steering does not match the repository's 4-axis implementation. |
| P1-02 | UI/UX Implementation Strategy artifact is underpowered relative to the workflows it supports. |
| P1-03 | Screen contract is too weak and overly anchor-centric; needs strengthening. |
| P1-04 | UI-bearing detection logic is inconsistent between documentation and implementation. |
| P1-05 | Render evidence is not wired end-to-end to user-facing output. |
| P1-06 | Browser QA runner remains at scaffold level only. |
| P1-07 | Prototyping mode split (static vs full-harness) is not cleanly exposed to users. |

### P2 -- Medium (completeness and polish)

| ID    | Summary |
| ----- | ------- |
| P2-01 | Repository state indicators (badges, status markers) are inconsistent. |
| P2-02 | Internal modules lack workflow documentation. |
| P2-03 | Migration/upgrade support is weaker than intended by the design. |
