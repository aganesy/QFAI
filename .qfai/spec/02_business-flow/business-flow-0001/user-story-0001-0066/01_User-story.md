# US-0001-0066: Flow-scoped report

## User Story

As an agent running a scoped gate on the story tree, I want `qfai report --flow BF-NNNN` to render the result of a flow-scoped validate run to report files of its own, so that parallel workers each render their own flow without overwriting the shared report.

## Non-goals

- A scope finer than one business flow
