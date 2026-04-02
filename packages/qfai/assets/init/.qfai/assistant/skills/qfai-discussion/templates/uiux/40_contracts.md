# Screen Contracts

## Purpose

Draft interaction contracts for key screens using the strong screen contract schema.

### Screen: [Screen Name]

- screen_id: SCR-001
- route: /path-to-screen
- purpose: [what the user accomplishes on this screen]
- actor: [primary user role]
- primary_tasks:
  - [task 1: trigger → success criteria]
  - [task 2: trigger → success criteria]
- required_states:
  - default: [default/empty state description]
  - loading: [loading indicator description]
  - empty: [empty state description]
  - error: [error message + retry CTA description]
- transitions:
  - empty → loading: [data fetch initiated]
  - loading → populated: [data received]
  - loading → error: [fetch failure]
  - error → loading: [retry action]
- observable_outcomes:
  - [expected user outcome → verification method]
  - [expected system behavior → verification method]
- notes_for_verify: [notes for verification/testing]
- notes_for_reviewer: [any additional context for the reviewer]

## Cross-references

- Selected direction: `30_comparison.md` (Selected Direction section)
- State coverage: see `../03_Story-Workshop.md` Design Direction Summary
