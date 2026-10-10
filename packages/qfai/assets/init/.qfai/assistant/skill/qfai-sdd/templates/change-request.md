# Change Request Row

Record a change request as one row in `<paths.specsDir>/decisions.md`. The row has exactly four cells: `ID`, `Content`, `Approach`, and `Status`. Do not create a separate change request file.

| ID         | Content                                                                                           | Approach                                                                                                                                | Status |
| ---------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `DEC-NNNN` | `Change request: <authorized repository-relative paths>; <conflicting fact and source reference>` | `<proposed change, reason, affected downstream work, owner rerun or validation required; approved by <who>, <when>, choosing <option>>` | `WIP`  |

- Allocate `DEC-NNNN` as the highest decision ID in this tree plus one. Never reuse an ID, including a retired one.
- Begin `Content` with `Change request:` and name every repository-relative path the decision can change; an ID there authorizes nothing. A path mentioned only in a discussion or an alternative does not authorize an edit.
- Describe the actual contradiction and its source in `Content`. In `Approach`, state the proposed correction, affected work, and the gate that proves it is applied, inside the form stated at the top of `templates/spec/decisions.md`. Keep both cells concise enough to review as a table row.
- Append the row only once the user approves the change, at `WIP`, and record in `Approach` who approved it, when, and the option chosen. Move it to `DONE` only after the owner rerun, affected artifacts, and validation evidence are complete. Use `SUPERSEDED (by DEC-NNNN)` when a later decision replaces the row, and `PARTLY SUPERSEDED (by DEC-NNNN)` when it replaces only part of it.
- Append a declined change at `REJECTED`, recording in `Approach` who declined it and when. It authorizes no edit.
- After appending, change only `Status`, apart from the drift protocol's
  explicit branch-added decision renumbering or published decision prefix
  recovery. Keep inherited ID, Content and Approach fixed, and never delete a
  row. A row the base holds at DONE authorizes nothing at any Status, so a later
  change needs a new row. If its scope or proposed correction changes, append a
  new decision row and supersede the old one.
- Keep open questions in `<paths.specsDir>/open-questions.md`. Use the same four columns there, with `OQ-NNNN` IDs and the statuses permitted by that template.

## Published decision prefix recovery

Use the same four-cell row only after actual approval covers this specific
recovery. Read `.qfai/assistant/rule/drift-protocol.md#published-decision-prefix-recovery`
for eligibility, byte boundaries, pre-write checks and stop conditions. Generic
protocol approval and a diagnostic suggestion do not authorize a target.

- Content names the target's repository-relative file and the unique target
  DEC ID. Approach records the published source commit, fixed base and unique
  common ancestor, with evidence the target is absent from the latter two and
  the source commit is a current-HEAD ancestor.
- Evidence names actual supporting files. Grounds records the recovery reason,
  actual approval authority, old and new SHA-256 Approach digests, and the exact
  approved `- Evidence: <actual file references> - Grounds: ` prefix, including
  its trailing space. Use actual references in place of the placeholder.
- The old digest matches the raw published source cell; the new digest matches
  the prefix plus the complete original Approach. State the single-line valid
  UTF-8 cell boundary: exclude only delimiter pipes and exactly one ASCII
  padding space at each end. Decode no escapes and trim or normalize nothing.
- State that original ordered, nonempty Residual risk and Rollback items are
  valid. Preserve ID, Content, Status, the full original suffix and every other
  row. Record the immediate pre-write uniqueness, unchanged-cell and old-digest
  checks, and the required existing validation without an exemption.
- Residual risk states the remaining observation and concurrency limits.
  Rollback removes only the recorded prefix when the current new digest still
  matches; otherwise it preserves the row and stops. Removal restores the
  original validation failure. Do not reset, amend or force push.

Inherited records, open-question rows, unavailable provenance, ambiguous byte
boundaries, duplicate IDs, stale digests and any unapproved change stop recovery.
Do not fill approval or execution fields with assumed answers or planned results.
