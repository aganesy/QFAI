# Worker edits and work orders

Read when assigning worker write paths or handling a refused edit.

## Edit boundary

The work order names the checkout assigned to the task by the host, the worker's
write paths and the permitted edit method. Creating a Git worktree does not
grant the host's tools permission to edit it. Even an assigned checkout can
receive a refusal; verify the actual edit result rather than claiming access.

If an edit is refused, stop writes to that target. Report the tool, working
directory, target path and refusal text, omitting secrets. Return the owned
paths and a reviewable diff that can be prepared within the worker's permitted
area. Do not bypass the refusal through a shell, script or another tool.
This does not forbid shell authoring where the host already permits it.

The orchestrator checks the diff against the current files in its own permitted
checkout before applying it. If that edit is refused too, leave the application
pending and continue only independent work. Follow the existing worktree or
shared-index mode in `.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory`
when assigning writers and integrating their paths.

## Work order template

```text
Task title: <short>
Role: <sub-agent role>
Review series: <reviewed artifact> + <reviewer role> + <replacement ordinal>   # review work orders only
Goal: <what to decide/produce>
Checkout: <absolute checkout assigned to this task by the host>
Write paths: <exact owned paths, or none for a read-only task>
Edit method: <host-permitted tool; worktree creation does not grant access>
If an edit is refused: stop that target; return tool, cwd, target, refusal text, owned paths and a reviewable diff
Inputs (refs):
- <file/section>
- .qfai/assistant/rule/drift-protocol.md#core-rule  <!-- the protected set, in front of the agent -->
Constraints:
- must: enforce Drift Protocol
- must: follow applicable test-layer or validation policy
- must_not: patch upstream artifacts directly; every upstream change requires
  STOP + Change Request + owner rerun per .qfai/assistant/rule/drift-protocol.md
Output format:
- <headings / bullet schema>
Time budget: none | <seconds>   # advisory: nothing stops at it. See .qfai/assistant/rule/stage-cost.md
Elapsed line: end every message with `elapsed <seconds>s / <budget>s`, or `elapsed <seconds>s` when the budget is none
Acceptance bar: <accept when ...> | <rework when ...>   # never `PASS`/`REVISE`: that is the reviewer's vocabulary and the completion gate matches on it, so a doer told to report in it emits a verdict on its own work
```
