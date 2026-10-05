# US-0001-0209: Run every step of the route

## User Story

As a user, I want each route to run every step its plan names, in order, with no step added or dropped for one request, so that a route's plan is the same for every request of its kind and a small change pays only for the steps that have something to write.

## Non-goals

- A step added or dropped for one request.
- A review after every step; the reviews of a route are stated in the workflow contract.
- Which steps exist and where they are installed, which the assistant-steps contract states.
