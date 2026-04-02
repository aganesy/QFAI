# UIX-REV: Screen Contracts Review

Review screen contracts for completeness.

## Required Fields per Screen

- screen_id
- route
- actor
- purpose
- primary_tasks
- required_states
- transitions
- observable_outcomes
- notes_for_verify
- notes_for_reviewer

## Quality Criteria

- Each screen contract must be independently verifiable
- Routes must be unique across all contracts
- Required states must include `default`, `loading`, `empty`, and `error`
