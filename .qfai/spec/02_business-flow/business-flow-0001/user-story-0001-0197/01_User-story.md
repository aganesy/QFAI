# US-0001-0197: Author acceptance tests as a stage of a run

## User Story

As an operator who asked for a feature once, I want `/qfai-atdd` to take its acceptance work order from the run, write the acceptance tests for the flow the run binds and report RED honestly, so that the run moves on to implementation without my typing a stage.

## Non-goals

- Deciding the plan.
- The `implement-seam` work order itself, which `/qfai-implement` serves.
- Judging whether the run is complete.
