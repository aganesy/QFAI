# US-0001-0193: Run only on a host that can carry the run

## User Story

As an operator, I want a run to start only on a host that can fetch a skill, delegate to a real sub-agent, relay a question and run the tests, so that a host that cannot is told so at once instead of failing halfway.

## Non-goals

- Gating runtime on the release's support claim.
- Automation on Copilot.
- Installing the skills and their host links.
