# 04_Sources

## Source Registry

| SRC-ID   | Title                                            | Type      | Location / Reference                                                           | Date       | Notes                                              |
| -------- | ------------------------------------------------ | --------- | ------------------------------------------------------------------------------ | ---------- | -------------------------------------------------- |
| SRC-0001 | v1.7.7 Gap Analysis and v1.7.8 Design Spec       | Document  | `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.7_gap_analysis_and_v1.7.8_design_spec.md` | 2026-03-30 | Primary input: 20 gap items, 14 deliverables, 14 AC |
| SRC-0002 | QFAI v1.7.7 Codebase                             | Codebase  | `QFAI-2-v1.7.7.zip` (audited)                                                  | 2026-03-30 | Static architectural audit base                     |
| SRC-0003 | Session canonical architecture decisions          | Decision  | Session conversation log                                                        | 2026-03-30 | 3-layer model, taste interview, trend research 等   |
| SRC-0004 | v1.7.7 CHANGELOG                                 | Document  | `CHANGELOG.md`                                                                  | 2026-03-30 | v1.7.7 correction release 改善記録                  |
| SRC-0005 | QFAI steering documents                           | Document  | `.qfai/assistant/steering/`                                                     | 2026-03-30 | Product/test-layers/review-roster policies          |
| SRC-0006 | Existing UIX validator rules                      | Code      | `packages/qfai/src/core/uixValidation/`                                         | 2026-03-30 | UIX-VAL-* / UIX-REV-* 現行実装                     |
| SRC-0007 | Existing prototyping CLI/skill                    | Code      | `packages/qfai/src/cli/commands/prototyping.ts`, `.qfai/assistant/skills/qfai-prototyping/` | 2026-03-30 | Mode split, precedence resolver 現行実装           |
| SRC-0008 | Discussion skill body                             | Document  | `.qfai/assistant/skills/qfai-discussion/SKILL.md`                               | 2026-03-30 | UI-bearing detection, sidecar generation rules      |
| SRC-0009 | Root cause analysis (Section 4)                   | Analysis  | SRC-0001 Section 4                                                              | 2026-03-30 | 3 structural patterns causing remaining gaps        |

## Traceability Notes

- All gap items (G-01 ~ G-20) trace to SRC-0001.
- All deliverables (D-01 ~ D-14) trace to SRC-0001 gap items.
- Canonical architecture decisions trace to SRC-0003.
- Current implementation state traces to SRC-0002, SRC-0006, SRC-0007.
