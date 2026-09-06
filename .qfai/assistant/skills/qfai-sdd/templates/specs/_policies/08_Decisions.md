# 08 Decisions

Shared Decision Records: decisions no single spec owns — one that crosses
specs, and one whose subject no spec owns at all. A `DR-*` cited from any
spec's `tdd/test-list.md` `DR-ID` column resolves against this file as well as
the spec's own `07_Decisions.md`, so a policy-level decision is cited, never
re-declared.

## ID scheme

- **Policy-level**: `DR-NNNN` — declared here, cited from any spec.
- A spec-only decision uses `DR-NNNN-MMMM` and belongs in that spec's
  `07_Decisions.md`. Declaring the same ID in both files gives it two owners.

## Decisions

<!-- One `### DR-NNNN` block per decision. Copy the sample below. -->

### DR-NNNN: one-line title

- Status: proposed | accepted | superseded | rejected
- Context: what forced the decision — the constraint, conflict or anomaly
- Decision: what was decided, in the imperative
- Consequences: what this costs and what it forecloses
- Related: the specs, capabilities, contracts or `CR-*` this decision binds, or `-`

## Empty State

- 0 items in shared decisions. Add an entry only when the decision is not
  spec-local: it genuinely crosses specs, or its subject belongs to no spec at
  all — a decision on a contract that no spec references has no
  `07_Decisions.md` to live in and is recorded here. A decision one spec owns
  belongs in that spec's `07_Decisions.md`.
  Delete the sample block above once the first real decision is recorded.
