# Change Request Row

Record a change request as one row in `<paths.specsDir>/decisions.md`. The row has exactly four cells: `ID`, `Content`, `Approach`, and `Status`. Do not create a separate change request file.

| ID         | Content                                                                              | Approach                                                                                                                                                   | Status |
| ---------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `DEC-NNNN` | `Change request: <authorized paths or IDs>; <conflicting fact and source reference>` | `<the form stated in templates/spec/decisions.md, carrying the proposed change, reason, affected downstream work, and owner rerun or validation required>` | `TODO` |

- Allocate `DEC-NNNN` as the highest decision ID in this tree plus one. Never reuse an ID, including a retired one.
- Begin `Content` with `Change request:` and name every path or ID the decision can change. A path mentioned only in a discussion or an alternative does not authorize an edit.
- Describe the actual contradiction and its source in `Content`. In `Approach`, state the proposed correction, affected work, and the gate that proves it is applied, inside the form stated at the top of `templates/spec/decisions.md`. Keep both cells concise enough to review as a table row.
- Append the row at `TODO` while approval is pending. Move its status to `WIP` when the proposed change is approved; move it to `DONE` only after the owner rerun, affected artifacts, and validation evidence are complete. Use `REJECTED` for a declined request or `SUPERSEDED (by DEC-NNNN)` when a later decision replaces it.
- After appending, change only `Status`. Never rewrite `ID`, `Content`, or `Approach`, and never delete the row. If its scope or proposed correction changes, append a new decision row and supersede the old one.
- Keep open questions in `<paths.specsDir>/open-questions.md`. Use the same four columns there, with `OQ-NNNN` IDs and the statuses permitted by that template.
