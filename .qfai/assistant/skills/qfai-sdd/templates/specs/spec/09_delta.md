# 09 Delta

<!-- Multi-run layout. `/qfai-sdd` is re-run against the same spec, so this
     file grows. Keep exactly one H2 per section for the file's lifetime and
     append inside it. Never open a second `## Change Summary` / `## Triage`
     H2 (dated variants such as `## Triage — 2026-01-01` included): the
     `QFAI-TRIAGE-*` checks read the first `## Triage` heading only, so rows
     parked under a duplicate heading are never validated. -->

## Change Summary

> One entry per `/qfai-sdd` run, appended in run order. Do not replace the
> previous entry and do not open a second `## Change Summary`.

- Change ID: DELTA-0001
- Date: YYYY-MM-DD
- Primary:
- Tags:
- Summary: <what changed>

<!-- A second run appends another five-line entry here (`- Change ID: DELTA-0002`, ...). -->

## Triage

> Stage 1 Triage SSOT for this spec. One row per incoming REQ/NFR.
> One `### DELTA-NNNN (YYYY-MM-DD)` sub-section per run; a re-run appends a new
> sub-section under this heading and never opens a second `## Triage` H2.
> See `references/sdd-triage.md` for the operation algorithm.
> Operation: CREATE | UPDATE | DELETE | SPLIT | MERGE | SUPERSEDE.
> Sub-op (UPDATE only): APPEND | MODIFY | REMOVE.
> Approved By: required for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE.
> Existing Spec takes a REAL target, never a placeholder: `spec-NNNN` (`+`-joined for
> MERGE), `_policies` on an UPDATE row, or `-` on a CREATE row. `QFAI-TRIAGE-009`
> grades the whole cell, so an unfilled one fails the gate rather than being ignored.

### DELTA-0001 (YYYY-MM-DD)

| Source   | Subject     | Existing Spec | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | ------------- | --------- | ------ | ----------- | --------- |
| REQ-XXXX | <one-liner> | spec-0001     | UPDATE    | APPEND | -           | <why>     |

## Update History

| Date       | DL      | Summary        |
| ---------- | ------- | -------------- |
| YYYY-MM-DD | DL-0001 | <what changed> |

## Decision Log

> This is the only section `npx qfai report` reads for Change Type metrics.
> One `### DL-NNNN` entry per decision, each carrying a `#### Meta` YAML block
> with all seven keys. A delta recorded anywhere else is invisible to the
> tooling and reports as zero decision entries.
> The entry below is a skeleton, not a decision: while `date`, `scope` and
> `notes` still hold their placeholders the report skips it and names this file
> as uncounted, rather than publishing a change nobody made.

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
- Re-opened by: `-` <!-- the `Status: re-open` DR-* in 07_Decisions.md that re-adopted this candidate; stays `-` while the rejection holds -->

<!--
`Re-opened by:` is the only sanctioned route out of `DO NOT`. Moving a rejected
candidate to `## Adopted` without it is the reintroduction the Delta Rejected
Guard blocks; `npx qfai validate` reports `QFAI-DECISION-006` when a
`- Candidate:` here also appears as an `- Adopted:` name while its own
`Re-opened by:` is empty, and `QFAI-DECISION-004` when the ID here resolves to
no `Status: re-open` record — and equally when such a record names no candidate
here. One `Re-opened by:` covers the candidate block it sits under, so a delta
re-adopting two candidates writes one per candidate.
-->

## Impact

- Affects: <files / modules / contracts>
- Validation: <what must pass>

## Follow-ups

- <next action>
- Owner: <owner>
- Due: YYYY-MM-DD

## Change Requests

<!-- The canonical CR-reference record required by
     `constitution/drift-protocol.md#when-drift-is-detected` step 4. One row per
     approved Change Request whose owner-skill rerun landed in this spec. The
     rerun writes it in Phase 4, never before approval. `Mode` is the rerun mode
     the CR approved (`confirm-only` or `re-derive`); `Applied at` matches the
     CR's own `Applied at`. A CR that also mints or amends a `DR-*` additionally
     cites its ID in that record's `Related` field in `07_Decisions.md`. Do not
     record a CR as a `## Triage` row: Triage rows carry incoming REQ/NFR
     operations, and only this table is the CR reference. -->

| CR ID            | Upstream artifact                  | Mode         | Approved by  | Applied at           |
| ---------------- | ---------------------------------- | ------------ | ------------ | -------------------- |
| CR-YYYYMMDD-NNNN | `<spec-NNNN>/04_Business-Rules.md` | confirm-only | `<approver>` | YYYY-MM-DDThh:mm:ssZ |

- 0 approved Change Requests recorded. Delete the sample row above once the
  first real one lands.
