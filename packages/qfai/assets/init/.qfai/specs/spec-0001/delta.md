# Delta

## Update History

| Date       | DL             | Summary                                    |
| ---------- | -------------- | ------------------------------------------ |
| 2026-02-12 | DL-20260212-01 | Keep legacy-compatible delta and plan SSOT |

## Decision Log

### DL-20260212-01: Keep compatibility files for current validators and skills

#### Meta

```yaml
id: DL-20260212-01
date: 2026-02-12
primary: Structural
tags: ["@docs", "@test"]
compat: Compatibility
scope:
  - specs
  - skills
notes: "Maintain spec.md/delta.md/scenario.feature/plan.md while layered files coexist."
```

#### Context

- Current CLI validators and downstream skills require legacy file names.
- Layered files remain useful as auxiliary authoring artifacts.

#### Candidates

- A) Migrate all consumers immediately.
- B) Keep compatibility files and add layered overlays.

#### Criteria

- No breakage in validate/report/planning to execution flow.
- Keep layered guidance available.

#### Adopted

- Selected option B.
- Keep `delta.md` as guardrail SSOT for current runtime checks.

#### Rejected

- option: "Switch to only 18_delta.md now"
  reason: "Current guardrails read delta.md only."
  do_not: "DO NOT remove delta.md before all consumers are updated."
  temptation: "New naming is cleaner but breaks existing automation."

#### Migration / Follow-ups

- Keep both naming layers during transition.
- Revisit once runtime readers support layered names.

#### Verification

### Plan

- id: VFY-001
  level: acceptance
  target: "legacy compatibility files exist and remain coherent"
  method: "check spec pack file set and run package checks"
  owner: dev
  expected: "validators and skill inputs can resolve required files"

### Evidence (optional)

- "Local package checks and PR review"

#### Notes

- `18_delta.md` can mirror contextual notes, but compatibility guardrails read this file.
