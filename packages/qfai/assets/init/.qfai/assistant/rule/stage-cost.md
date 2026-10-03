# Stage Cost

What a stage costs, and the levers that change it: how deeply a model reasons
per step, how long the stage is given, and how much of a file an edit rewrites.

None of them is a cap. Where a hard limit is wanted, it is the per-request
output limit. A budget too small for the work makes an agent decline the work or
stop early rather than attempt it.

## Reasoning depth

The `effort` setting sets how much a model reasons per step. Its levels are
`low`, `medium`, `high`, `xhigh` and `max`. On another host, the equivalent
setting applies.

The right level differs by stage. A lower level can suit code review when a
measurement shows that accuracy holds on the tasks reviewed.

| Role                            | Level              | Measurement |
| ------------------------------- | ------------------ | ----------- |
| Every agent card under `agent/` | The host's default | None yet    |

A role gets a row of its own only with the measurement that chose its level: the
tasks run, the levels compared, and what each returned. Without one, the level
is a guess.

### A higher level can cost more on a long deliverable

At the top levels a model can draft most of a long output while reasoning, then
write it again as the reply. This can lengthen the turn without improving the
result.

The stages that produce long documents are spec authoring, contract
normalization and a full review pack. Run them at the default level unless a
gain has been measured. Where a higher level is used, tell the model that
reasoning and reply share one output limit, so drafting the deliverable twice
cuts the reply off.

## Time

A work order may carry a time budget in seconds. The agent ends every message
with its elapsed time against that budget, for example `elapsed 340s / 1200s`,
or with elapsed time alone where the work order sets none.

The elapsed line makes progress against the budget visible.

It is advisory. Nothing stops at the budget.

## Whole-file rewrites

A whole-file rewrite can repeat unchanged content and consume output tokens
even when the resulting file is identical. A one-line instruction to edit only
the lines that change, where that does not affect the result, can reduce this
cost.

A rewrite can introduce unrelated changes that a diff-based guard sees.
