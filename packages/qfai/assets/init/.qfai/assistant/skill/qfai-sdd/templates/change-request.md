# Change Request Row

Record a change request as one row in `<paths.specsDir>/decisions.md`. The row has exactly three cells: `ID`, `Content` and `Approach`. Do not create a separate change request file.

| ID                   | Content                                                                                           | Approach                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DEC-yyyymmddhhMMss` | `Change request: <authorized repository-relative paths>; <conflicting fact and source reference>` | `<reason, owner rerun or validation required; approved by <who>, <when>, choosing <option>>` |

- The ID is the UTC time the row is written, `DEC-yyyymmddhhMMss`. When a row of the register already holds that second, take the next second no row holds. Never reuse an ID.
- Begin `Content` with `Change request:` and name every repository-relative path the decision can change; an ID there authorizes nothing. A path mentioned only in a discussion or an alternative does not authorize an edit.
- Describe the actual contradiction and its source in `Content`. In `Approach`, record the reason, who approved the change, when, the option chosen and the gate that proves it is applied, inside the form stated at the top of `templates/spec/decisions.md`. Do not restate the edit itself: the changed files hold it.
- Append the row only once the user approves the change, on the branch that makes it. The row authorizes edits to the paths it names on that branch only. A change request the base already holds authorizes nothing, so later work on the same paths appends a new change request.
- Never edit, move or remove the row afterwards. If its scope changes, append a new change request.
- Record a declined change as a row whose `Content` opens `Declined change request:` and names the same paths, recording in `Approach` who declined it and when. It authorizes no edit. A later approval reopens it with a new change request whose `Approach` opens `Reopens DEC-…` with the declined row's ID.
- Keep open questions in `<paths.specsDir>/open-questions.md`. Use the same three columns there, with `OQ-yyyymmddhhMMss` IDs.
