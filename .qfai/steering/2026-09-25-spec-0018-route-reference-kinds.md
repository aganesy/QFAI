---
id: 2026-09-25-spec-0018-route-reference-kinds
status: active
kind: blocker
created: 2026-09-25
updated: 2026-09-25
scope: spec-0018
blocking: true
promote-to: null
links: ["spec-0018"]
---

# Route reference kinds

## What is blocked

`CR-20260925-0004` names 51 dependent ledger rows. Forty-six `todo` rows are
parked at `blocked`. `TDD-0015` remains at `review-fix`; `TDD-0001` and
`TDD-0004` remain `done`. `TDD-0014` and `TDD-0455` retain their existing
blockers. The open CR itself prevents all 51 rows from completing.

## Why it waits

The route proposal stores references as strings. A missing root file
`Dockerfile` with no existence fact has the same shape as a symbolic reference
and reaches a CREATE question. The route contract promises `unknown-path`
refusal for a missing referenced path. The contract must identify each reference
kind before the checker can apply that rule without guessing from spelling.

## What releases it

After the user selects a representation, `/qfai-sdd` updates CLI-WF, CLI-WFFILE
and `spec-0018` through `CR-20260925-0004`'s owner reruns. Sweep the dependent
rows, migrate producer/parser/schema/fixtures, and reverify completed selectors
and oracles without resetting unchanged obligations. Resume each row only after
the CR records its application and any overlapping blocker is also resolved.
