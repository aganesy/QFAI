# US-0002-0004: Shipped change detection and a green-on-skip verdict

## User Story

As an adopter, I want the detection job of the shipped orchestrator to choose the lanes to run from a name-only diff filtered as JSON without a third-party action, to emit a warning annotation and fail open to the full superset on a diff failure, a shallow clone or an unrecognised path, and the verdict job in the same file to stay out of an event whose selection is empty, so that a skipped lane never blocks my required check and an event with nothing to test starts one job.

## Non-goals

- A third-party change-detection action in the shipped set, which would push its pin and trailer problem onto every adopter
- Satisfying a required check with path filters alone
- Change detection in QFAI's own CI, which deliberately uses a separate implementation with a third-party action
