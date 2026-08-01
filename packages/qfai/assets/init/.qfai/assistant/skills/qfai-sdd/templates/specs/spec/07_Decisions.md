# 07 Decisions

Decision Records for this spec. A `DR-*` cited from the `DR-ID` column of
`tdd/test-list.md` — which every `exception` row is required to carry — resolves
against this file, so an entry here is what makes that citation checkable.

## ID scheme

- **Spec-scoped**: `DR-NNNN-MMMM`, where `NNNN` is this spec's number. Use this
  form for a decision that binds only this spec.
- **Policy-level**: `DR-NNNN`, declared in `_policies/08_Decisions.md` instead.
  Cite it from here rather than re-declaring it; an ID declared twice has two
  owners.

`npx qfai validate` accepts both shapes. A `DR-ID` cell matching neither raises
`TDDLIST_EXCEPTION_INVALID_DR`; one that resolves to no entry in either file
raises `TDDLIST_EXCEPTION_UNRESOLVED_DR`.

## Decisions

<!-- One `### DR-NNNN-MMMM` block per decision. Copy the sample below. -->

### DR-NNNN-MMMM: one-line title

- Status: proposed | accepted | superseded | rejected
- Context: what forced the decision — the constraint, conflict or anomaly
- Decision: what was decided, in the imperative
- Consequences: what this costs and what it forecloses
- Related: the `AC-*` / `BR-*` / `TC-*` / `TDD-*` / `CR-*` this decision binds, or `-`

## Empty State

- 0 decisions in this spec. Delete the sample block above once the first real
  decision is recorded.
