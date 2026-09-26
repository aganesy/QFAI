# Decision Record

- ID: `DR-0298`
- Title: `The intent-driven batch closes its open rows without per-row review`
- Kind: `accepted-risk` — the Decision Record an `exception` row names
- Scope: every ledger row the intent-driven batch seeded or reset that was not
  terminal on 2026-09-25, in spec-0001, 0002, 0003, 0004, 0008, 0010, 0011,
  0012, 0013, 0014, 0015, 0017 and 0018
- Decided by: `user`, 2026-09-25, through the structured question tool
- Status: accepted

## Decision

The user waived the per-row reviews for the remaining rows as an exception, and
asked for the implementation to be finished, opened as a pull request and
merged.

What stays:

- Each row's test is written first. It fails on an assertion before the code
  exists and passes after. The implementer records both runs.
- Every CI lane still has to pass before the merge.

What is waived:

- `qa-gatekeeper` RED and GREEN turns.
- `completion-reviewer` and `implementation-reviewer` passes, per row and per
  `T1` group.

## How a row records it

- `Status`: `exception`.
- `DR-ID`: `DR-0298`, beside any `CR-*` the row keeps.
- `Evidence`: a pointer to the row's entry in the stage evidence file.
- The row's `TDD-ID` is listed in the `TDDLIST-001` waiver for its ledger in
  `.qfai/waivers.yml`.

## Why not `done`

A `done` row must carry the review fields. Without them `QFAI-TDDLIST-008`
fails the row, and holding that failure in the backlog pins would turn the
ratchet into a list of accepted gaps. `exception` with an accepted-risk record
states what happened.

## Reopening

A later review pass takes a row through `exception` → `todo` and runs the cycle
with its reviews.
