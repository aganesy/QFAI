# Work Orders Summary

A session that dispatched any lookup MUST record a `## Work Orders Summary`
table in the artifact its invoking stage writes. Use the shared schema from
`.qfai/assistant/rule/shared-skill-delegation-baseline.md`, including
the `Agent instance` column.

| Step | Role (sub-agent) | Agent instance  | Task title                      | Input (refs)                    | Output (refs)                   | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ------------------------------- | ------------------------------- | ------------------------------- | ---------------------------- |
| 1    | Reviewer         | `<instance id>` | Read the facts a round waits on | Decision and what it depends on | The fact, and where it was read | PASS/REVISE                  |
