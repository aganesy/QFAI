# UIX-REV: Open Questions Review

Review `<paths.specsDir>/open-questions.md` for questions that block the UI under review.

## Blocking Criteria

The register has three columns: ID, Content and Approach. It has no status or
severity column. A row is open while it exists, and a row is never edited.

- A row blocks the review when its Content or Approach names a screen, flow,
  story, AC, EX or contract the review covers, or when the reviewed UI cannot be
  built without its answer.
- A row whose Content opens `Unadjudicated:` is an unanswered critical product
  decision. It blocks every UI that depends on it, and `qfai validate` reports
  it while the row exists.
- Any other row does not block this review and stays as it is.

## Resolution

Each blocking question is resolved or deferred before the review passes. Neither edits the row.

- To resolve it, in the same change append a decision row to `<paths.specsDir>/decisions.md` that names the question's ID, and delete the question row.
- To defer it, delete the row and append a new one whose Approach names the next decision point and says `Replaces OQ-…` with the deleted ID. Defer only when the reviewed UI no longer needs the answer before that point.
- Include the OQ ID in every related issue description.
