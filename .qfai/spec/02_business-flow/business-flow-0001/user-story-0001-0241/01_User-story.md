# US-0001-0241: Keep an agent's turn going while a turn-end check fails

## User Story

As a developer delegating work to an agent in a QFAI project, I want the host to continue the agent's turn while a check my project marks for turn end fails, so that a finished turn means the check passed, not that the agent said it did.

## Non-goals

- Running a check the project did not mark for turn end.
- Judging the conversation with a model, as a goal condition does.
- Limiting turns, time or spending of an unattended run.
