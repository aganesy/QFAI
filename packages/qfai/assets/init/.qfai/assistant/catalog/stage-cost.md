# Stage Cost

What a stage costs, and the levers that change it: how deeply a model reasons
per step, how long the stage is given, and how much of a file an edit rewrites.

None of them is a cap. Where a hard limit is wanted, it is the per-request
output limit. A budget too small for the work makes an agent decline the work or
stop early rather than attempt it.

## Reasoning depth

The host's effort setting, or its equivalent, sets how much a model reasons per
step. The right level differs by stage. For code review, accuracy has been found
to hold at lower levels, so a fast pass at review time and a thorough pass later
can be run at different levels.

| Role                                       | Level              | Measurement |
| ------------------------------------------ | ------------------ | ----------- |
| Every role in `manifest/agent-catalog.yml` | The host's default | None yet    |

A role gets a row of its own only with the measurement that chose its level: the
tasks run, the levels compared, and what each returned. Without one, the level
is a guess.

### A higher level can cost more on a long deliverable

At the top levels a model can draft most of a long output while reasoning, then
write it again as the reply. The turn doubles in length and the result does not
improve.

The stages that produce long documents are spec authoring, contract
normalization and a full review pack. Run them at the default level unless a
gain has been measured. Where a higher level is used, tell the model that
reasoning and reply share one output limit, so drafting the deliverable twice
cuts the reply off.

## Time

A work order may carry a time budget in seconds. The agent ends every message
with its elapsed time against that budget, for example `elapsed 340s / 1200s`,
or with elapsed time alone where the work order sets none.

The line makes a team of agents finish sooner with comparable answer quality. It
works by keeping more agents running in parallel, not by doing less work, which
is the opposite of what a lower reasoning level does.

It is advisory. Nothing stops at the budget.

## Whole-file rewrites

Current models rewrite a whole file for a small change more readily than earlier
ones. The result is usually identical, so nothing fails and nothing is measured;
it only costs more. A one-line instruction to edit only the lines that change,
where that does not affect the result, brings the cost back down.

A rewrite also touches lines the change did not mean to touch, and a guard that
reads the diff sees every one of them.

## Sources

- Effort: <https://platform.claude.com/docs/en/build-with-claude/effort>
- Task budgets:
  <https://platform.claude.com/docs/en/build-with-claude/task-budgets>
- Long deliverables and whole-file rewrites:
  <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1>
