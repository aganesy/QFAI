<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

id: qfai-sdd-planning
title: QFAI SDD Planning (How SSOT)
description: "Create implementation-brief.md and lock implementation constraints for downstream execution phases."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, QAEngineer, CodeReviewer]
mode: approval-gated

---

# /qfai-sdd-planning — Build Implementation Plan SSOT

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
- Do NOT duplicate templates in this workflow markdown.
- Completion requires a format self-check in evidence.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/delta.md`
- P4: `.qfai/specs/<spec-id>/spec.md`, `scenario.feature`, contracts

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If planning must revisit a rejected option, add a `[RE-OPEN]` decision record with explicit approval evidence.

## CRITICAL CONSTRAINTS (Read First)

- This phase MUST create or update:
  - `.qfai/specs/spec-XXXX/implementation-brief.md`
- The brief is the How SSOT and must be concise, explicit, and implementation-binding.
- Required headings must exist in fixed order:
  1. `Scope & Intent`
  2. `Architecture / Approach`
  3. `Implementation Plan`
  4. `Contracts & Data`
  5. `Test Strategy`
  6. `Risks & Mitigations`
  7. `Open Questions / Spikes`
- Open Questions / Spikes should be `None` unless a documented spike is required.
- Planning decisions should be appended to delta as `DR-HOW-*` entries when strategy changes.
- You MUST run full validation:
  - `qfai validate --fail-on error`
- Completion must be approved by a reviewer who did not author the brief.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: remove ambiguity from implementation decisions.
- Deliverable completeness: verify required headings and concrete constraints.
- OQ / placeholder scan: remove unresolved placeholders (`TBD`, `TODO`, `???`, etc.) unless explicitly deferred.
- Smoke check (if applicable): run the smallest command to prove artifacts are valid.

## Goal

Transform refined SDD artifacts into a constrained implementation plan that downstream skills must follow.

## Non-goals

- Writing production code or tests.
- Expanding into a full design document beyond required constraints.

## Mandatory Outputs

- `.qfai/specs/spec-XXXX/implementation-brief.md`
- Updated `.qfai/specs/spec-XXXX/delta.md` when planning decisions changed
- Evidence file: `.qfai/evidence/sdd-planning-<spec-id>.md`

## Implementation Brief Template (Minimum)

- Use `.qfai/templates/spec/implementation-brief.md` as the single source of truth.
- Do not duplicate the template content in this workflow file.

## Change Control During Execution

If execution discovers a conflicting implementation path:

1. STOP implementation.
2. Update `implementation-brief.md`.
3. Append delta decision (`DR-HOW-*`).
4. Re-run full validation.

## Quality Gate

Run:

```bash
qfai validate --fail-on error
```

This phase must pass default/full validation.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/sdd-planning-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs and spec-id
- `DR-HOW-*` IDs added or updated
- Full validation result
- Confirmation that downstream phases must follow the brief

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `implementation-brief.md` exists and matches required heading order.
- [ ] Any planning strategy change is recorded in delta decisions.
- [ ] Full validation passed (`qfai validate --fail-on error`).
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.
