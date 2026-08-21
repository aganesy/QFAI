# UI-affecting items (definition)

This file is the **only** definition of `UI-affecting` in `/qfai-implement`. Every site that uses
the term — the Visual Review Guard, the sub-agent roster, Handoff Contract 5, gate item 9, the
per-item evidence contract and `parallelization-policy.md` — points here instead of restating the
qualifying condition in its own words.

It exists because the term was previously stated four non-identical ways and defined nowhere. Gate
item 9 blocks `done` on it, the actor who decides whether it applies is the actor the gate exists
to check, and "not UI-affecting" was both always defensible from the text and the cheapest answer:
it removes a reviewer round from the row.

## The test

Evaluate the clauses against the row **as the ledger declares it**, in order, and stop at the first
that holds. An item is **UI-affecting** when any of the following holds:

1. Its `Layer` is `Component`.
2. Its `Owning module` matches a UI path declared in `.qfai/assistant/catalog/structure.md`.
   Evaluated **only when the ledger declares one**: that column is optional
   (`execution-ledger.md#declared-seam-column-optional-required-for-parallel-dispatch`) and `-`
   means "not declared", so a rule keyed on it alone would be unevaluable on the ledgers that omit
   it.
3. Its `Test file` matches a UI path declared in `.qfai/assistant/catalog/structure.md`.
   `Test file` is the only path-valued **required** column, so this clause is evaluable on every
   ledger — it is what keeps the definition total.
4. Any obligation the row carries (`TC-Refs`, `US-Refs`) resolves to a screen, element or action
   declared in a `.qfai/contracts/ui/*.yaml`.

## What the test is not

- Nothing outside those four clauses makes an item UI-affecting, and no clause is waivable by
  judgement. "It does not feel like UI", "the change is only a token", "the screen renders it but
  the row is backend" are not clauses. A row that changes an API response body a screen renders is
  selected by clause 4 if a UI contract declares that surface, and by nothing otherwise — the
  answer comes from the artifacts, not from the implementer's reading of an adjective.
- When `catalog/structure.md` declares no UI path at all, clauses 2 and 3 do not fire. That is the
  project stating it has no UI surface, not an invitation to substitute a wider or narrower test.
- The clauses select the **reviewer**, not the verdict. `product-surface-reviewer` still decides
  PASS / REVISE once routed; `agents/product-surface-reviewer.md` governs what it reviews.

## Recording the answer

The answer is recorded either way, so that item 9 leaves an artifact even when it is satisfied
vacuously. In the row's per-item evidence entry, `Prototype parity` carries:

| Outcome         | `Prototype parity` value                             |
| --------------- | ---------------------------------------------------- |
| A clause fired  | the product-surface-reviewer verdict, PASS or REVISE |
| No clause fired | `n/a (not UI-affecting)`                             |

A blank cell satisfies neither branch and blocks `done` like any other missing gate field. Without
this record the failure mode is silent by construction: a skipped item 9 leaves nothing behind, so
a row that had a UI surface and declined to say so is indistinguishable afterwards from a row that
legitimately had none.

Under coordinated parallel mode the worker returns this field in its evidence block like every
other contract field, and the orchestrator writes it (`parallelization-policy.md`).
