# 08 Decisions

Cross-spec Decision Records. A `DR-*` cited from any spec's `tdd/test-list.md`
`DR-ID` column resolves against this file as well as the spec's own
`07_Decisions.md`, so a policy-level decision is cited, never re-declared.

## ID scheme

- **Policy-level**: `DR-NNNN` — declared here, cited from any spec.
- A spec-only decision uses `DR-NNNN-MMMM` and belongs in that spec's
  `07_Decisions.md`. Declaring the same ID in both files gives it two owners.

## Decisions

<!-- One `### DR-NNNN` block per decision. Copy the sample below. -->

### DR-0000: one-line title

- Status: proposed | accepted | superseded | rejected
- Context: what forced the decision — the constraint, conflict or anomaly
- Decision: what was decided, in the imperative
- Consequences: what this costs and what it forecloses
- Related: the specs, capabilities or contracts this decision binds, or `-`

## Empty State

- 0 items in shared decisions. Add an entry only when a decision genuinely
  crosses specs; a spec-local one belongs in that spec's `07_Decisions.md`.
  Delete the sample block above once the first real decision is recorded.
