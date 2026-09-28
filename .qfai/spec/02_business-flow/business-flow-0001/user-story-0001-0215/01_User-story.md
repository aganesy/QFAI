# US-0001-0215: Re-route a run when diagnosis shows it is on the wrong route

## User Story

As an operator, I want a run whose diagnosis shows the request is something else — a question, a duplicate, a broken test, a feature — to move to the route that fits, only at points its route declares and keeping the evidence already gathered, so that a wrong first reading costs neither a restart nor an unplanned change.

## Non-goals

- A route change at a step that is not a declared branch point.
- A route change that lowers a modifier.
- Re-routing that never ends.
