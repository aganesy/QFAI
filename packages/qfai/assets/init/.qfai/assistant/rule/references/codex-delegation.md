# Codex Delegation

Read before the first `spawn_agent` call when the host is Codex.

## Codex delegation notes

A sub-agent should cost the orchestrator one brief and one final answer. A call
that only checks progress, such as a short wait, a sleep or an agent listing,
is one more model call, so the orchestrator makes none.

- **Self-contained brief.** Call `spawn_agent` with `fork_turns: "none"` and a
  `message` that holds everything the sub-agent needs: the task, the files to
  read, the paths it may write, the checks to run and the shape of its answer.
  `fork_turns` defaults to `"all"`, which copies the whole parent thread into
  the sub-agent. Where the tool takes `fork_context` instead, leave it out or
  pass `false`.
- **One final answer, no interim messages.** The brief tells the sub-agent to
  send no `send_message` updates and to return its result once, as its final
  answer. Where `wait_agent` takes no `targets`, every queued message ends the
  orchestrator's wait early.
- **Long wait.** With no work of its own left, the orchestrator calls
  `wait_agent` with a `timeout_ms` of minutes, such as `600000`, not 10 to 60
  seconds, within the maximum the tool states. A wait that times out is
  followed by another long wait.
- **No polling.** Never wait with `sleep`, a loop of short `wait_agent` calls or
  repeated `list_agents` calls. `followup_task` gives a sub-agent a new task; it
  never asks for progress.
