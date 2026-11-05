<!--
Each row records one open question, and exists exactly while the question is
open. A row is never edited.

A new row's ID is OQ-yyyymmddhhMMss: the UTC time the row is written, as 14
digits. When a row of this register already holds that second, take the next
second no row holds. A legacy OQ-NNNN row keeps its ID.

When a decision settles a question, the same change appends the decision row
to decisions.md, naming this row's ID, and deletes this row. To defer a
question already written, delete its row and append a new one whose Approach
names the next decision point and says `Replaces OQ-…` with the deleted ID.
Validation reports a deleted question that no decision row and no question
row names. A row whose Content opens `Unadjudicated:` is an unanswered
critical product decision, pending while the row exists.
-->

# Open Questions

## Open Questions

| ID  | Content | Approach |
| --- | ------- | -------- |
