# US-0001-0208: Verify as the final stage of a route

## User Story

As an operator who asked for a feature once, I want `/qfai-verify` to run the final gates as a stage of the route and report each finding for the stage that owns it, so that completion rests on this route's own gate results and no stage patches what another stage owns.

## Non-goals

- Repairing a story, a contract, a test or production code.
- Changing the path, fields or values of `verify.json`.
