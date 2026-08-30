---
id: 2026-08-05-chg-007-toolchain-capability
status: archived
kind: decision
created: 2026-08-05
updated: 2026-08-05
scope: global
blocking: false
promote-to: null
links:
  - spec-0017
  - spec-0003
  - spec-0006
  - spec-0008
  - spec-0015
  - discussion-20260804173914356
closure-rationale: >-
  Both decisions were captured at the policy layer in the same change —
  `_policies/08_Decisions.md` (DR-0275, DR-0276) and `_policies/10_delta.md`
  § CHG-007 — so there is no pending promotion. This entry exists to make two
  things durable that the decision rows alone do not carry: the mechanism that
  forced DR-0275, and a correction to a claim this run escalated and later
  falsified. The narrative record of both lives in `.qfai/evidence/` and
  `.qfai/review/`, which are gitignored, so without this entry neither would
  survive in a tracked file.
---

# CHG-007 — a new capability required revoking an ID reservation first

## The mechanism, stated so it is not rediscovered

`validateSpecSplitByCapability` derives its expected spec set **positionally**
from the capability count: it maps each capability's list _index_ to
`spec-000<index+1>` and never reads the capability's own number. The expected
set is therefore always a contiguous `spec-0001..spec-000N`.

The consequence is stronger than it looks. **Any reserved gap ID becomes
unsatisfiable the moment the capability count reaches it**, because N only
grows. Adding a 17th capability while `spec-0017` was reserved had no legal
outcome: using the reserved ID violated the reservation, and using the next free
ID raised `QFAI-SPLIT-103` (missing) and `QFAI-SPLIT-104` (extra) at the same
time, both at `error`. Reproduced empirically before the fix.

Whether a gap sat _inner_ or _trailing_ when it was reserved is irrelevant — the
first correction of the slice policy got this wrong and had to be corrected
again. `spec-0017` was a **trailing** gap and it detonated at the very next
capability addition.

So: permanent ID reservations are not maintainable while the gate is positional.
The slice policy now says reservations are temporary and a gap must be
renumbered once the count reaches it. Making the gate number-based instead is
`OQ-0023`; until it lands, the renumber rule is the only workaround.

## A claim this run escalated and then falsified

Through review round 7 this run reported a "durable gap handed to the user":
that `paths.testsDir` pointed at a repository-root `tests/` directory that does
not exist, making the ATDD traceability gate unsatisfiable and requiring a
user decision plus a repository-root addition.

**That was false, and the correction matters more than the original claim.**
The directory exists and is tracked; it holds two markdown annotation ledgers
carrying 200 and 486 `QFAI:` annotations; the scanner's default glob includes
markdown; and `spec-0001` clears both ATDD gates from that exact directory
today. The remaining `QFAI-ATDD-111` / `112` findings are ordinary annotation
work owned by `/qfai-atdd` and `/qfai-implement`.

The escalation was withdrawn across all four artifacts that carried it. No user
decision is outstanding from the SDD stage. Recorded here because an unwarranted
escalation that also misdirects toward a policy-gated root addition is the kind
of error worth being able to find again.

## Coverage-density triage (Required Process step 12)

`QFAI-COV-207` is a warning listing artifacts covered exactly once. Disposition
for the packs this change touched:

- **`spec-0017`, 66 business rules with one example each** — accepted as
  intentionally single-case. The `BR → EX` mapping is 1:1 and index-aligned by
  design, recorded at `05_Examples.md:7-8` and `09_delta.md:107`.
- **`spec-0017`, 50 examples with one test case each** — accepted. Depth is
  guaranteed one level up, where it is observable: **0 of 34 acceptance criteria
  have a single test case**, and every one carries a normal case plus an error or
  boundary case. The 16 examples with two or more cases are those owning several
  distinct falsifying oracles.
- **`spec-0003`, 21 acceptance criteria with one test case each** — pre-existing,
  not introduced here. All 12 criteria this change added carry two or more.
  Raised at review round 1 and left unrepaired deliberately; it is outside the
  eight requirements this change absorbed.

No density signal was accepted silently, and none required adding a case.
