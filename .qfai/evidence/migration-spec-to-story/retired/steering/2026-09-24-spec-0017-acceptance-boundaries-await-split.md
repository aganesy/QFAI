---
id: 2026-09-24-spec-0017-acceptance-boundaries-await-split
status: archived
kind: blocker
created: 2026-09-24
updated: 2026-09-25
scope: BF-0002
blocking: false
promote-to: null
closure-rationale: The story-tree cutover removed the spec-0017 execution ledger, so no row
  waits on ledger evidence. The split tests annotate the BF-0002 examples
  they prove.
links:
  - BF-0002
---

# Acceptance rows await formal verification

## What is blocked

The six original rows and nine new sibling rows remain at `todo`. The six test
cases now hold 15 independent boundaries. Their tests and ledger paths have
moved to three files under `packages/qfai/tests/integration/`. A focused run
passed all 15 tests. Formal ATDD evidence is being reacquired at the required
L3 location; GREEN alone does not complete a ledger row.

## Why it waits

The user approved `CR-20260924-0002`, and `/qfai-sdd spec-0017` recorded the
split in the test cases and execution ledger. The coverage-depth matrix now
accounts for 9 user stories, 92 test cases and 69 business rules. It also
identifies 66 pre-existing test cases whose tests sit outside the required L3
location and therefore do not count as formal ATDD coverage. Those placement
gaps are an existing backlog, separate from this pull request's 15 changed
boundaries. Neither the updated matrix nor the focused GREEN run supplies the
separate RED or falsifiability, evidence, checkpoint and reviewer results for
the 15 changed rows.

## What releases it

Finish formal ATDD P1d at the new test locations and `/qfai-implement`
evidence for the 15 changed rows. Record each row's RED or falsifiability,
GREEN, review and checkpoint result before advancing it. Report the 66
pre-existing placement gaps and their gate impact separately.
