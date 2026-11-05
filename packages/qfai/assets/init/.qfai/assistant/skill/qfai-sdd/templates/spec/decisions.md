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

Write each row's Approach as these four items, in this order, each written as
`- ` followed by its label, after any opening citation above:

- `Evidence:` one or more entries, separated by `; `. A `file:` entry is a
  repository-relative path, optionally followed by `#L<start>-L<end>`. A
  `command:` entry is the command, then `→` and a short summary of its result.
- `Grounds:` which evidence supports the decision, and how.
- `Residual risk:` the risk that remains, or `none — <reason>`.
- `Rollback:` the steps that undo the decision, or `none — <reason>`.

No item is empty, and only the last two may take `none — <reason>`. What a
kind of row must state in its Approach, such as a change request's approval
(who, when and the option chosen), goes inside these items. A change request
does not restate the edit. Write a `|` inside a cell as `\|`.

Validation checks this form only on a legacy DEC-NNNN row, so a passing result
does not prove that a timestamp-form row follows it.

A release approval, with `<...>` standing for the project's values, has this
Content cell:

Release <X.Y.Z> approved by <name> on <date>, option "<label>"

and this Approach cell, written on one line and without backticks around it:

- Evidence: file:CHANGELOG.md; command:<the release checks> → <result> - Grounds: <why the checks support the release> - Residual risk: none — <reason> - Rollback: <the steps that retract the release>

A stage that does not own this file records its decisions in its own final
report, with the same four items under the same rules.

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
