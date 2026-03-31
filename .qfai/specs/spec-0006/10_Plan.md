# 10 Plan

- Spec: spec-0006
- Parent: CAP-0006

## 1. Implementation Strategy

### Primary Source Files

| File                                           | Responsibility                                            |
| ---------------------------------------------- | --------------------------------------------------------- |
| `packages/qfai/src/cli/commands/doctor.ts`     | CLI entry point. runDoctor() with format/failOn routing   |
| `packages/qfai/src/core/doctor.ts`             | createDoctorData() - all diagnostic logic                 |

### Key Functions (implemented)

| Function              | Responsibility                                                  |
| --------------------- | --------------------------------------------------------------- |
| `runDoctor()`         | CLI orchestrator: call createDoctorData, format, write output   |
| `createDoctorData()`  | Execute all diagnostic checks, return structured result         |
| `formatDoctorText()`  | Format doctor data as text                                      |
| `formatDoctorJson()`  | Format doctor data as JSON                                      |
| `shouldFailDoctor()`  | Determine exit code based on failOn and summary counts          |

## 2. Dependencies

| Dependency          | Content                                            |
| ------------------- | -------------------------------------------------- |
| spec-0003 (init)    | init creates the structure doctor diagnoses        |

## 3. Implementation Order

All functionality is already implemented. This spec documents existing behavior.
