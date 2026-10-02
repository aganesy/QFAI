---
category: specialties
update-frequency: occasional
dependencies: [00_universal/thinking.md, 00_universal/quality.md]
version: 1.0.0
---

# Design Review Guidelines

Points to check for UI/UX, information design, API design and similar work.

## Common Checks

- Are the purpose and the user's actions clear? Are required inputs and the behaviour on error defined?
- Are the dependencies, data flow and boundaries (responsibilities) simple?
- Are accessibility and internationalization considered, where relevant?

## Frontend

- Keep state minimal, and split it into single-responsibility hooks and components.
- Validate input with types and validation (such as zod), and design how errors are shown.
- Performance: Avoid needless re-renders and rendering large lists, and memoize where needed.

## Backend / API

- Keep schemas to the necessary minimum, with meaningful type names. Provide a migration procedure for breaking changes.
- Are authentication/authorization and input validation in place? Use one response format for exceptions.
- Are there hook points for logging and monitoring, without overdoing it?

## Summarizing Deliverables

- Briefly describe the architecture diagram, main flows, data model and error-handling policy.
- List concerns, trade-offs and undecided items.
