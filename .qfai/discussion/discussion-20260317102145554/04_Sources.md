# 04 Sources

## Input Sources

| Source ID | Title                                           | Location                                                 | Description                                                                                                                    |
| --------- | ----------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SRC-0001  | QFAI v1.6.0 Implementation Design for Engineers | `tmp/qfai_v1.6.0_implementation_design_for_engineers.md` | Primary design document defining the unified implementation skill, test-list.md ledger, Phase 1 validator, and migration plan. |
| SRC-0002  | Existing Codebase                               | `packages/qfai/`                                         | Current implementation reference including existing TDD skills, validators, asset templates, and test suites.                  |
| SRC-0003  | Workflow Definition                             | `.qfai/assistant/instructions/workflow.md`               | Current workflow definition governing skill invocation order and phase transitions.                                            |
| SRC-0004  | Spec Layout Definition                          | `.qfai/specs/README.md`                                  | Spec directory structure definition that governs where `tdd/test-list.md` will reside.                                         |

## Notes

- SRC-0001 is the authoritative source for v1.6.0 scope and design decisions.
- SRC-0002 serves as the baseline for identifying old skill references that must be purged.
- SRC-0003 and SRC-0004 define existing contracts that the new skill must conform to.
