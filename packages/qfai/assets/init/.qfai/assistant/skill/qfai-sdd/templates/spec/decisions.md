# Decisions

Each row records one decision. Its Approach cell holds these four items, in
this order, each written as `- ` followed by its label:

- `Evidence:` one or more entries, separated by `; `. A `file:` entry is a
  repository-relative path, optionally followed by `#L<start>-L<end>`. A
  `command:` entry is the command, then `→` and a short summary of its result.
- `Grounds:` which evidence supports the decision, and how.
- `Residual risk:` the risk that remains, or `none — <reason>`.
- `Rollback:` the steps that undo the decision, or `none — <reason>`.

No item is empty, and only the last two may take `none — <reason>`. What a
kind of row must state in its Approach, such as a change request's proposed
correction, goes inside these items. Write a `|` inside a cell as `\|`.

## Decisions

| ID  | Content | Approach | Status |
| --- | ------- | -------- | ------ |
