# 12 OQ Resolution Log

Append-only timeline of OQ resolution events.

## 2026-04-15 — Initial Resolution Pass

All 5 open questions were resolved in the initial discussion pass by the requirements-analyst + discovery-analyst sub-agent.

| Event | OQ-ID | Resolution Summary | Decided By |
|-------|-------|-------------------|------------|
| resolved | OQ-0001 | PROTOTYPING_SUPPORTED_SURFACES = [web, mobile, desktop, mixed]. Includes `mixed` for cross-platform UI surface coverage. Explicitly excludes `cli`, `api`, `backend`. Rationale: `mixed` is a legitimate UI-bearing surface in the QFAI taxonomy; excluding without cause would create an unintended gap. | agent (discovery-analyst) |
| resolved | OQ-0002 | `surfacePolicy.ts` as standalone file at `src/core/prototyping/surfacePolicy.ts`. Rationale: SRP — `mode.ts` already owns obligations derivation; surface allowlist is a separate concern that benefits from isolated unit testing and clean import paths. | agent (requirements-analyst) |
| resolved | OQ-0003 | CalibrationLoader failure → throw `Error` immediately with `packPath` included in the error message. Rationale: precondition failures in the harness use throw semantics; no caller needs to distinguish `CalibrationPackError` from other errors; fail-fast is the correct contract. | agent (requirements-analyst) |
| resolved | OQ-0004 | `reviewerLogs[].verdict` stores mapped vocabulary: `approve`, `revise`, `reject`, `abandon`. Rationale: validator checks these values; storing pre-mapping originals creates unnecessary translation steps and increases validator branching without audit benefit. | agent (requirements-analyst) |
| resolved | OQ-0005 | Observation records containing `uiContractId` field → hard-error. Rationale: backward compat is explicitly abandoned; silent ignore hides stale test fixtures; hard-error surfaces the problem immediately and forces correct cleanup. | agent (requirements-analyst) |

## Resolution Summary

- Total OQs opened: 5
- Total OQs resolved: 5
- Total OQs deferred: 0
- Gate: discussion ✅ all resolved
