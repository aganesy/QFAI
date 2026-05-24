# 10 Plan

- Spec: spec-0006
- Parent: CAP-0006

## 1. Implementation Strategy

### Primary Source Files

| File                                       | Responsibility                                          |
| ------------------------------------------ | ------------------------------------------------------- |
| `packages/qfai/src/cli/commands/doctor.ts` | CLI entry point. runDoctor() with format/failOn routing |
| `packages/qfai/src/core/doctor.ts`         | createDoctorData() - all diagnostic logic               |

### Key Functions (implemented)

| Function             | Responsibility                                                |
| -------------------- | ------------------------------------------------------------- |
| `runDoctor()`        | CLI orchestrator: call createDoctorData, format, write output |
| `createDoctorData()` | Execute all diagnostic checks, return structured result       |
| `formatDoctorText()` | Format doctor data as text                                    |
| `formatDoctorJson()` | Format doctor data as JSON                                    |
| `shouldFailDoctor()` | Determine exit code based on failOn and summary counts        |

## 2. Dependencies

| Dependency       | Content                                     |
| ---------------- | ------------------------------------------- |
| spec-0003 (init) | init creates the structure doctor diagnoses |

## 3. Implementation Order

All functionality is already implemented. This spec documents existing behavior.

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0006-0010..0011 per AC-0006-0010..0014:
  1. Playwright probe rebuild: `node_modules/.bin/playwright` primary, Windows shims (`playwright.cmd`/`.bat`/`.ps1`), then `npx --no-install playwright --version`, then `playwright-cli` family during the deprecation window, then install hint `npm i -D playwright`.
  2. `D-DEPRECATED-PROBE` finding lifecycle (warning during 1.9.x; error at sunset 1.10.0).
  3. `skills.integrity` default severity downgrade to `warning`; 2-group summary output ("errors blocking active profile" vs "warnings advisory of drift").
- NFR-0112: fresh `qfai init` + `npm i -D playwright` MUST yield zero `[error]` lines from `qfai doctor --profile prototyping`.
