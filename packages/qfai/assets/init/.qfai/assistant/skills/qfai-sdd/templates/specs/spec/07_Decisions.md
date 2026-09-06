# 07 Decisions

Decision Records for this spec. A `DR-*` cited from the `DR-ID` column of
`tdd/test-list.md` — which every `exception` row is required to carry — resolves
against this file, so an entry here is what makes that citation checkable.

## ID scheme

- **Spec-scoped**: `DR-NNNN-MMMM`. Use this form for a decision that binds only
  this spec. Setting `NNNN` to the spec's own number is the recommended
  convention and keeps the id self-locating, but validation checks the shape,
  not the match — do not read a passing run as confirmation of the pairing.
- **Policy-level**: `DR-NNNN`, declared in `_policies/08_Decisions.md` instead.
  Cite it from here rather than re-declaring it; an ID declared twice has two
  owners.

`npx qfai validate` accepts both shapes. A `DR-ID` cell matching neither raises
`TDDLIST_EXCEPTION_INVALID_DR`; one that resolves to no entry in either file
raises `TDDLIST_EXCEPTION_UNRESOLVED_DR`.

## Decisions

<!-- One `### DR-NNNN-MMMM` block per decision. Copy the sample below. -->

### DR-NNNN-MMMM: one-line title

- Status: proposed | accepted | superseded | rejected | re-open
- Context: <what forced the decision — the constraint, conflict or anomaly>
- Decision: <what was decided, in the imperative>
- Consequences: <what this costs and what it forecloses>
- Related: the `AC-*` / `BR-*` / `TC-*` / `TDD-*` / `CR-*` this decision binds, or `-`
- Re-opens: `-` <!-- the prior `DR-*` this re-adopts; required when Status is `re-open` -->
- Approved by: `-` <!-- who approved the re-open; required when Status is `re-open` -->
- Approved at: `-` <!-- YYYY-MM-DDThh:mm:ssZ; required when Status is `re-open` -->

## Re-open records

`Status: re-open` is the `[RE-OPEN]` decision record the Delta Rejected Guard
(`.qfai/assistant/constitution/shared-skill-operating-baseline.md`) requires before a candidate
listed under a delta's `## Rejected` may be re-adopted. It is an ordinary entry
in this file, so it inherits the ID scheme above and resolves the same way.

A re-open entry carries three things beyond a normal decision:

- `Re-opens:` — the prior `DR-*` being reconsidered. It must be a declared ID,
  and it cannot be the entry's own nor a re-open that points back at it: a pair
  citing each other has no prior decision anywhere in the loop.
- `Decision:` — what changed since the rejection. A re-open that repeats the
  original argument is the reintroduction the guard exists to stop, and the
  sample block's own `<...>` prompt counts as unwritten.
- `Approved by:` / `Approved at:` — the explicit approval, the time as
  `YYYY-MM-DDThh:mm:ssZ`. Until both are filled, the entry stays
  `Status: proposed`.

The rejected candidate in the same spec's delta points back at it through
`## Rejected`'s `Re-opened by:` line. Both directions are required, so the
rejection and the re-adoption are readable from either end.

`npx qfai validate` reports `QFAI-DECISION-001` when the entry's own ID is off
the scheme or `Re-opens:` is missing, malformed, self-referential or circular,
`QFAI-DECISION-002` when it resolves to no declared record, `QFAI-DECISION-003`
when the approval is absent or `Approved at:` is not a real
`YYYY-MM-DDThh:mm:ssZ` instant, `QFAI-DECISION-004` when the delta's
`Re-opened by:` and this entry do not name each other,
`QFAI-DECISION-005` when `Decision:` is missing, `QFAI-DECISION-006` when a
candidate the delta lists under `## Rejected` reappears under `## Adopted` with
no `Re-opened by:` of its own, and `QFAI-DECISION-007` when the same `DR-*` is
declared twice in this file, which leaves the re-opened decision ambiguous. A
re-open asserted anywhere else — a PR description, a commit message — is not
one.

## Empty State

- 0 decisions in this spec. Delete the sample block above once the first real
  decision is recorded.
