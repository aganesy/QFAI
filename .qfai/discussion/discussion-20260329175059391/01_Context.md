# 01 Context

## Metadata

| Key           | Value                                 |
| ------------- | ------------------------------------- |
| Discussion ID | discussion-20260329175059391          |
| Date          | 2026-03-29                            |
| Owner         | agent                                 |
| Source        | qfai_v1.7.6_design_spec_renumbered.md |
| Surface Type  | non-ui                                |

## Goal and Completion Criteria

### Goal

v1.7.6 introduces a premium multi-iteration evaluator loop (`/qfai-prototyping-full-harness`) as an explicit non-default mode, backed by an external critique adapter, calibration assets, and observability infrastructure. The standard path must remain unchanged and unaffected.

### Completion Criteria

1. External critique adapter interface and fail-open semantics are defined
2. Calibration pack structure and scoring alignment assets are specified
3. `/qfai-prototyping-full-harness` skill with planner/generator/evaluator split is defined
4. Cost/time observability and reviewer drift tracking are specified
5. Long-running handoff artifacts and display/stub detection are defined
6. Standard path has zero regression from premium path addition
7. Open OQ count reaches 0 before discussion close

## Stakeholders

- Primary: QFAI core developers, `/qfai-prototyping` users (engineering teams using spec-driven development)
- Secondary: QA teams performing structured reviews, CI/operations maintainers
- Indirect: Teams evaluating QFAI for adoption, downstream skill consumers

## Background

### Business Context

v1.7.5 established a stable evidence foundation with static-first default prototyping. Users who need higher-quality prototype output -- particularly for complex specifications -- currently lack a structured iterative refinement path within QFAI. v1.7.6 addresses this by introducing a premium mode that layers critique, calibration, and multi-loop evaluation on top of the existing foundation without disturbing the standard path.

### Technical Context

The standard `/qfai-prototyping` path remains the default. The new `/qfai-prototyping-full-harness` skill is an explicit opt-in that decomposes the generation cycle into planner, generator, and evaluator phases. An external critique adapter provides structured feedback from configurable providers (e.g., generic command providers, optional example providers). Calibration assets ensure evaluator scoring consistency. The loop runs 5-15 iterations, capped at a configurable maximum, with accept/refine/pivot exit policies and plateau detection.

## Assumptions

1. v1.7.5 evidence foundation is stable and does not require rework
2. Standard path remains the default; premium path is always explicit opt-in
3. External critique providers may be unavailable; fail-open semantics are mandatory
4. Calibration assets can be independently updated without code changes
5. Long-running sessions may be interrupted; handoff artifacts must support resumption

## Issues

1. **Premium path concept creep** -- risk of premium semantics bleeding into standard path obligations
2. **Critique provider noise** -- external providers may return low-signal feedback that degrades iteration quality
3. **Calibration maintenance cost** -- scoring alignment assets require ongoing curation
4. **Stale state in long-running mode** -- multi-iteration loops accumulate context that may become stale or inconsistent
5. **Cost ceiling uncertainty** -- premium path resource consumption needs bounding but optimal limits are not yet determined

## Change Classification

| Dimension     | Value                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| Change Type   | Behavior, Structural, Ops                                                      |
| Compatibility | Improvement (additive premium path, no breaking)                               |
| Risk          | Functional=High, Performance=High, UX=Medium, Security=Medium, Operations=High |
