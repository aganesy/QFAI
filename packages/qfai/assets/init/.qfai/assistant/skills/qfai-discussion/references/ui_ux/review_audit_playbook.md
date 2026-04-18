# UI/UX Review Audit Playbook

Use this file when the core checklist is not enough.

## Heuristic Review Pass

Review the design direction against these durable heuristics:

- system status is visible
- product language matches user language
- users can cancel, go back, undo, or recover
- terms and patterns are consistent
- error-prone input is constrained or prevented
- users recognize options instead of recalling them
- novice and expert use are both supported where relevant
- unnecessary noise is removed
- errors explain recovery
- help is contextual and task-oriented

## Layout And Information Architecture

Check for:

- a clear reading path
- meaningful grouping and spacing
- obvious hierarchy
- limited top-level navigation choices
- shallow nesting
- no dead-end screens
- no false bottoms or hidden overflow

## Forms And Actions

Check for:

- visible labels
- appropriate input types
- inline validation near the source
- preserved input on error
- descriptive action labels
- one clear primary action
- destructive actions separated from constructive actions

## Screen States

Each important screen should specify:

- what empty means
- what loading looks like
- what a recoverable error says
- how the user retries or exits
- whether success needs confirmation or summary

## Accessibility Audit

Check for:

- keyboard access
- visible focus
- heading and landmark clarity
- non-color cues
- adequate target size
- readable copy
- screen-reader-compatible semantics where custom UI exists

Note:
- automated accessibility tools catch only part of the problem;
- manual keyboard and screen-reader review is still required.

## Anti-Pattern Red Flags

Flag immediately if you see:

- mystery-meat navigation
- placeholder-only labels
- premature or submit-only validation
- broken back behavior
- invisible navigation
- silent failure
- blocking full-screen spinners
- tiny touch targets
- gesture-only critical actions
- manipulative dark patterns

## Documentation Expectations For QFAI

A good discussion artifact should make these reviewable without guesswork:

- screen inventory or equivalent key-surface coverage
- flow logic including error paths
- component or interaction inventory where it matters
- responsive/adaptive behavior where the surface changes materially
- accessibility constraints
- decision rationale and rejected options

## Recommended Audit Order

1. Validate user goal and flow.
2. Validate option comparison and anchor choice.
3. Validate state coverage and contracts.
4. Validate accessibility and platform fit.
5. Validate anti-pattern absence.
6. Validate traceability into `04_Sources.md`, `14_Review-Request.md`, and `99_delta.md`.
