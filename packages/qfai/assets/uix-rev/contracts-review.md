# UIX-REV: Screen Contracts Review (`40_screen_contracts.md`)

Review screen contracts for canonical 11-field schema completeness.

## Required Fields per Screen (canonical 11-field schema)

1. `screen_id` — unique identifier
2. `route` — URL path or navigation target
3. `purpose` — what the screen accomplishes
4. `actor` — who uses this screen
5. `primary_tasks` — main user tasks on this screen
6. `secondary_tasks` — additional tasks
7. `required_states` — must include `default`, `loading`, `empty`, and `error`
8. `transitions` — navigation to/from this screen
9. `observable_outcomes` — what success looks like
10. `notes_for_verify` — verification guidance
11. `notes_for_reviewer` — reviewer-specific notes

## Quality Criteria

- Each screen contract must be independently verifiable
- Routes must be unique across all contracts
- Required states must include `default`, `loading`, `empty`, and `error`
- All 11 fields must be present and non-empty for each screen
- Screen contracts must stay consistent with root `DESIGN.md` (brand SSOT) and the recorded primary spec
- Screen contracts must stay consistent with Browser QA findings and screen-linked evidence
- Do not reference legacy filenames such as `40_contracts.md`
- Keep wording aligned with scoring-ready canonical fields and avoid stale migration vocabulary
