# Change Request

- ID: `CR-20260818-0002`
- Title: `A declined-only adopter tree is told its installed workflows match the packaged copy, and declined appears in no surface at all`
- Raised by: `implementation-reviewer (advisory A-1) during the spec-0006 TDD-0036 / TDD-0037 review; measured against the built CLI`
- Raised at: `2026-08-18T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — reword the ok message so it does not assert a match it did not make
- Applied at: `2026-08-23T00:00:00Z` — the production repair landed 2026-08-22 in e6ca1ef89; the missing half was the oracle, and both ok arms are now pinned and shown to differ
- Superseded by: `-`
- Blocked set: `(none — the implementation conforms to TC-0006-0035 as written; the gap is upstream of it)`

## The measurement

`qfai init` into a temp tree, then delete every shipped workflow the provenance
record names, then `qfai doctor`:

```text
[ok] workflows.integrity: installed shipped workflow(s) match the packaged copy
```

There are **no** installed shipped workflows. The operator is told their installed copies match.
`details` is `{ workflowsDir }` only, so the two names QFAI classified as `declined` appear in no
output surface: not the severity, not the message, not the payload.

## Why this is not a bug in the row that just landed

`TC-0006-0035` requires exactly this: severity `ok`, no drift finding, and `details.declined` absent.
`TDD-0037` implements it and pins it, correctly. The shipped-workflows contract §3 requires a
declined name never to be reported again, and promoting it to a finding trigger would report it
forever. **Every one of those decisions is right.**

The gap is between them. §3 forbids _re-reporting_ a declined name as a problem. It does not say the
operator must be unable to observe that QFAI knows the file is gone — and `BR-0006-0022`'s stated
purpose for carrying `declined` in the drift payload is exactly that transparency: so an operator can
see QFAI is leaving the file alone on purpose. On a declined-only tree that purpose is unreachable,
because there is no finding to carry the payload.

The `ok` arm's own comment names the adjacent hazard it was built to avoid — a caller that "emits on
`ok` alone reports a match on a tree where nothing was looked at" — and gates on `comparedCount > 0`
for that reason. A declined-only tree is the case where names **were** looked at and none is
`installed`, which that gate does not distinguish. The message is then literally false rather than
merely uninformative.

## Options (at least 3) and recommendation

### Option A — reword the `ok` message so it does not assert a match it did not make (recommended)

`installed shipped workflow(s) match the packaged copy` becomes a form that is true when the
installed set is empty — e.g. naming what was examined rather than what matched. No severity change,
no payload change, no new state. Cost: one shipped string, and the tests that pin it
(`TDD-0030`'s message assertion) co-change.

### Option B — carry `declined` in the `ok` payload as well

`details` gains `declined` on the `ok` arm, so the information exists in the JSON surface without
changing severity or the exit code. Cost: `TDD-0030` pins the `ok` payload as exactly
`["workflowsDir"]` and left a note warning against loosening it, and `TDD-0037` now pins the same
property from the other side. Both would have to change in the same commit, and the note's argument —
that a loosened key-set assertion stops pinning a deleted property — has to be answered rather than
overridden.

### Option C — accept it and record the limit

No code change; `BR-0006-0022`'s transparency clause is scoped explicitly to trees that already
produce a finding, and the declined-only case is documented as out of scope. Cost: the false `ok`
message survives, and it is false rather than merely narrow.

**Recommendation: A**, because the defect that is not arguable is the **message**, and A fixes exactly
that without touching a severity, a payload contract or a pinned key set. B is a real improvement but
it reopens a deliberately-closed assertion; if B is wanted it should be its own row with its own
oracle. C is only acceptable if A is also taken.

## Impact scope

- Production: `src/core/doctor.ts` ok arm under A; the reader and the ok arm under B.
- Specs: `AC-0006-0026` / `BR-0006-0022` and the `.qfai/contracts/cli/qfai-doctor.md` emission table
  under A or B.
- Ledger rows: none reset. `TDD-0030`'s message assertion co-changes under A.
- Adopter-visible: yes — it is an operator-facing string.

## Decision needed from user

Choose A, B or C.

## Approved actions (owner skill rerun plan)

1. Owner is `packages/qfai/src` plus the packaged detection surface, not a spec-authoring skill: the
   gap is that `declined` appears in no surface, which is a code and contract change carrying its own
   spec row and test. **No mode applies** — the fix is in `packages/qfai/src` plus the packaged detection surface, neither of which the step-4 invocation table covers.
2. Downstream ledger sweep: **no rows are reset.** `TC-0006-0035` is implemented as written and its
   evidence stays true — this CR's own header says the gap is upstream of it. If the approved option
   changes what `TC-0006-0035` asserts, the sweep is exactly that one row and it is named here so a
   wider reset cannot claim approval: `spec-0006 TDD-0035`.
3. Cross-check after applying: a declined-only tree must be reported as declined by every surface the
   approved option names, verified over a planted tree rather than argued.

## Resolution

Pending.
