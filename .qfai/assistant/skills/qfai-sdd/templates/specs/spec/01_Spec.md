# 01 Spec

- Spec: <spec-id>
- Parent: CAP-XXXX
- Status: active
<!-- When Status changes, add the matching companion bullet on a new line:
     - Status: superseded  → add `- Superseded-by: spec-NNNN`
     - Status: deprecated  → add `- Deprecated-at: YYYY-MM-DD`
     - Status: removed     → add `- Deprecated-at: YYYY-MM-DD`
     QFAI-STATUS-003..006 enforce these conditional fields. -->

## Consumer View

- Primary SSOT for execution: `<spec-id>/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
- Out:

## Applicable NFR

- NFR:

## Applicable Policy

- Policy:

## Evidence Summary

- Evidence:

## Relevant Requirements

- REQ:

## Entry points

- US range in this spec: US-0001..
- Primary actors:
- Notes:

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
