<!--
Each row records one decision the user made. It is appended once the decision
is made, and is never edited, moved or removed afterwards. The register holds
decisions only; a question not yet decided goes to open-questions.md.

A new row's ID is DEC-yyyymmddhhMMss: the UTC time the row is written, as 14
digits. When a row of this register already holds that second, take the next
second no row holds. A legacy DEC-NNNN row keeps its ID.

The opening of Content gives a row its kind:

- `Change request: <paths>` is an approved change. It authorizes edits to the
  repository-relative paths it names, and only on the branch that adds it. A
  change request the base already holds authorizes nothing.
- `Declined change request: <paths>` is a change request the user declined.
  Its Approach records who declined it and when.
- `Declined: <option>` is any other option the user rejected.
- `Test exception: <BF, AC or EX>` exempts that item while the row exists.
- Any other Content is a decision the user made.

A declined row is a rejected option and authorizes nothing. A later decision
that refers to an earlier row opens its Approach with the earlier ID:

- `Supersedes DEC-…` replaces the earlier decision.
- `Narrows DEC-…` replaces part of it.
- `Reopens DEC-…` reopens a declined option.

The earlier row stays as written. The order of rows means nothing: a merge may
interleave the rows two branches appended.

Write each row as a short decision record. Content states what was
decided; Approach says why, in one to three short sentences: the context
that forced the choice and the reason it won, and, for an approval, who
approved it, when and the label of the option chosen. Point to where the
detail lives, such as a contract rule, a story or a pull request, instead of
restating it. Add an optional item only when it tells a later reader
something those sentences do not, each written as `- ` followed by its label,
after any opening citation above:

- `Considered:` the options that lost, and why.
- `Consequences:` what the decision makes easier or harder.
- `Rollback:` the steps that undo it, when they are not obvious.

Content and Approach together stay within 600 characters, the paths a
change request names not counted; validation warns on a longer row. Write a
`|` inside a cell as `\|`.

A legacy DEC-NNNN row above DEC-2097 was written in an earlier form whose
four items, Evidence, Grounds, Residual risk and Rollback, validation still
checks; a new row does not use that form.

A release approval, with `<...>` standing for the project's values, has this
Content cell:

Release <X.Y.Z> approved by <name> on <date>, option "<label>"

and this Approach cell, written on one line and without backticks around it:

<the release checks and their result, in one sentence>. - Rollback: <the steps that retract the release>

A stage that does not own this file records its decisions in its own final
report, in the same short form.

A root may list decision pages in an optional '## Decision pages' section
before '## Decisions', with only unique direct '- decisions/page-NNNN.md'
entries in read order. Each page uses the same closed three-column table and
has no page index. Read listed pages before this root table. Append new rows
only to this root, which has no line limit; appending to a page is a protected
edit. No row moves between files.

-->

# Decisions

## Decisions

| ID  | Content | Approach |
| --- | ------- | -------- |
