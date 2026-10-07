# Host Backstops

Read when a host limit on agents is involved.

## Host backstops above the declared shape

The dispatch limits in this baseline and in each skill's own policy are read by
the agent doing the dispatch. A run that has lost its way is the one least likely
to apply them, so nothing here bounds a run that spawns more workers than it
declared, nests delegation deeper than the stage intended, or keeps spending.

Some hosts refuse delegation outside their limits. Each control below states
what it covers.
QFAI sets none of them, so the host defaults stand.

**A backstop sits above the declared shape, never at it.** Leave room for other
permitted agents sharing the host limit. The policy decides the ordinary case.

Claude Code 2.1.217 or later:

| Control                                                                              | Default                      | What it bounds                                             |
| ------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------- |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`                                               | 3 (1 in 2.1.217 and 2.1.218) | How deep delegation nests. `1` turns nesting off           |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`                                               | 20                           | When new Agent tool spawns are refused                     |
| `--max-budget-usd` in print mode; `maxBudgetUsd` / `max_budget_usd` in the Agent SDK | none                         | What one run may spend, in US dollars, sub-agents included |

The spawn limit has exceptions for ultracode, `/subtask` forks, and resuming an
exited agent.

Codex:

| Control                                                                                   | Default                    | What it bounds                                                        |
| ----------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| `agents.max_concurrent_threads_per_session` in `config.toml` (alias `agents.max_threads`) | chosen by Codex when unset | How many spawned-agent threads are open at once, the primary excluded |

No equivalent was confirmed for nesting depth or for a spend cap.

GitHub Copilot CLI:

| Control                            | Documented default                   | What it bounds                           |
| ---------------------------------- | ------------------------------------ | ---------------------------------------- |
| `subagents.maxDepth` setting       | 6 in the limits table                | How deep sub-agents nest                 |
| `COPILOT_SUBAGENT_MAX_DEPTH`       | 4 in the environment-variable table  | How deep sub-agents nest                 |
| `subagents.maxConcurrency` setting | set by the Copilot plan, 2 to 32     | How many sub-agents run at once          |
| `COPILOT_SUBAGENT_MAX_CONCURRENT`  | 32 in the environment-variable table | How many sub-agents run at once          |
| `--max-ai-credits`                 | unset                                | AI credits per response, as a soft limit |

The two settings take effect only on usage-based billing plans.

The depth defaults disagree across the CLI documentation. Which control takes
precedence was not confirmed.

VS Code Local harness (`runSubagent`):

| Control                                        | Default | What it bounds                                                        |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `chat.subagents.allowInvocationsFromSubagents` | `false` | Whether a sub-agent may start sub-agents. Nesting stops at depth five |

No equivalent was confirmed for concurrent sub-agents or for a spend cap. None
was confirmed for any of the three in the Copilot cloud agent.
