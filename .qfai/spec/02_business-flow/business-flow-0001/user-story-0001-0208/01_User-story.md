# US-0001-0208: Verify as the final stage of a run

## User Story

As an operator who asked for a feature once, I want `/qfai-verify` to run the final gates as a stage of the run and send each finding to the stage that owns it, so that completion rests on this run's own verdict and no stage patches what another stage owns.

## Non-goals

- Deciding whether the run is complete, which `finish` does
- Copying the report under the run, which the workflow core does
- Repairing a story, a contract, a test or production code
- Changing the path, fields or values of `verify.json`
