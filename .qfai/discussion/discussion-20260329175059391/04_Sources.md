# 04 Sources

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329175059391 |
| Date          | 2026-03-29                   |

## Source Registry

| SRC-ID   | Type           | Title                                    | Location                                                          | Usage                                              |
| -------- | -------------- | ---------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| SRC-0001 | design-spec    | QFAI v1.7.6 Design Specification        | `qfai_v1.7.6_design_spec_renumbered.md` (local file)             | Primary scope, OQ, slice definitions, risk profile |
| SRC-0002 | prior-release  | QFAI v1.7.5 Evidence Foundation          | `.qfai/discussion/discussion-20260329130000123/`                  | Baseline evidence architecture, static-first path  |
| SRC-0003 | external-ref   | Anthropic Harness Concept Article         | external reference                                                | Multi-loop harness pattern, planner/generator/evaluator decomposition |
| SRC-0004 | roadmap        | QFAI Compressed Roadmap v1.7.6 Scope     | `local file (not committed)`                                      | Release scope boundaries, slice prioritization     |
| SRC-0005 | ssot           | v1.7 Scoring-Ready Axes and Aggregate Rules | `.qfai/specs/` (scoring axes definitions)                      | Calibration baseline, weighted score/floors        |
| SRC-0006 | ssot           | discussion README                        | `.qfai/discussion/README.md`                                      | Discussion pack structure, OQ/Deferred column defs |
| SRC-0007 | repository     | project architecture                     | `.instruction/02_project/architecture.md`                         | Surface type = CLI/toolkit confirmation             |
| SRC-0008 | repository     | tech stack                               | `.instruction/02_project/tech-stack.md`                           | Node/TypeScript/Vitest/pnpm prerequisites          |

## Traceability Notes

- REQ/NFR/OQ are primarily sourced from `SRC-0001`; pack format inherits from `SRC-0006`
- Calibration pack design references scoring axes from `SRC-0005`
- Harness loop pattern is informed by `SRC-0003` adapted to QFAI's CLI context
- Non-ui classification is confirmed by `SRC-0001` combined with `SRC-0007`
- v1.7.5 baseline stability assumption is grounded in `SRC-0002`

## Competitive Reference Registry

Non-ui pack; no competitive UI references applicable.
