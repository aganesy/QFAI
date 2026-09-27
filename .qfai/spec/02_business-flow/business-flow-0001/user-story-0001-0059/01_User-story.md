# US-0001-0059: Business-flow scoped validation

## User Story

As an agent running a scoped gate on the story tree, I want `qfai validate --flow BF-NNNN` to check one business flow and write its result to a file of its own, so that parallel workers each gate their own flow without overwriting one another's result.
