# US-0001-0209: Run every step of the route, reviewed once per stage

## User Story

As an operator, I want each stage of a run to run every step its route names, in order, with no step added or dropped for one request, and to be reviewed once, at its end, by the reviewers those steps need, so that a run's plan is the same for every request of its kind and a small change pays only for the steps that have something to write.

## Non-goals

- A step added or dropped for one request.
- A review at the end of every step.
- The whole-change review at `finish`, which stays the independent `qa-gatekeeper` PASS.
- Which steps exist and where they are installed, which the assistant-steps contract states.
