# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: YYYY-MM-DD
- Primary:
- Tags:
- Summary: <what changed>

## Triage

> Stage 1 Triage SSOT for this spec. One row per incoming REQ/NFR.
> See `references/sdd-triage.md` for the operation algorithm.
> Operation: CREATE | UPDATE | DELETE | SPLIT | MERGE | SUPERSEDE.
> Sub-op (UPDATE only): APPEND | MODIFY | REMOVE.
> Approved By: required for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE.

| Source   | Subject     | Existing Spec | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | ------------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | <spec-NNNN>   | UPDATE    | APPEND | -           | <why>     |

## Update History

| Date       | DL      | Summary        |
| ---------- | ------- | -------------- |
| YYYY-MM-DD | DL-0001 | <what changed> |

## Decision Log

> This is the only section `qfai report` reads for Change Type metrics.
> One `### DL-NNNN` entry per decision, each carrying a `#### Meta` YAML block
> with all seven keys. A delta recorded anywhere else is invisible to the
> tooling and reports as zero decision entries.

### DL-0001

#### Meta

```yaml
id: DL-0001
date: YYYY-MM-DD
# Initial | Behavior | Structural | Ops (exactly one)
primary: Initial
# @api | @db | @nfr | @docs | @test (zero or more)
tags: ["@docs"]
# Compatibility | Improvement | Change | Bug-for-bug
compat: Improvement
scope:
  - <file / module / contract this decision touches>
notes: <one line of context>
```

#### Migration / Follow-ups

- <migration step, or "No migration required.">

#### Rejected

- option: <candidate name>
  reason: <why rejected>
  do_not: <must not reintroduce>
  temptation: <why people may accidentally choose it again>

#### Verification

> Required when `compat: Change`. See `constitution/change-classification.md`.

### Plan

- id: VFY-001
  # unit | integration | acceptance | manual | migration | rollback
  level: unit
  target: <what is verified>
  method: <how it is verified>
  # dev | qa | reviewer | ops
  owner: dev
  expected: <observable pass condition>
  links:
  - <evidence path or issue reference>

## Rationale

- <why this change is needed>

## Candidates Considered

1. <candidate A>
2. <candidate B>

## Adopted

- Adopted: <candidate name>
- Why: <reason>
- Evidence: <file or decision reference>

## Rejected

- Candidate: <candidate name>
- Reason: <why rejected>
- DO NOT: <must not reintroduce>
- Temptation: <why people may accidentally choose it again>

## Impact

- Affects: <files / modules / contracts>
- Validation: <what must pass>

## Follow-ups

- <next action>
- Owner: <owner>
- Due: YYYY-MM-DD
