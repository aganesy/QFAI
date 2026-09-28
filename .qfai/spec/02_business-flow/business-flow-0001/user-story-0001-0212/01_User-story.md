# US-0001-0212: Stage 1 checks a routing-time CREATE approval instead of asking

## User Story

As an operator who approved a new story or a new business flow when the run was routed, I want `/qfai-sdd` Stage 1 to check that approval rather than ask me again, and to stop rather than guess when the approval is missing, does not match or has gone stale, so that I answer the CREATE question once and nothing is created on an approval I did not give.

## Non-goals

- Asking the CREATE question a second time
- Letting `--auto`, a mode or an agent-written value stand in for my answer
- The check the workflow core makes when it accepts the stage's result
- How a standalone `/qfai-sdd` triages and asks outside a run, which stays as it is
