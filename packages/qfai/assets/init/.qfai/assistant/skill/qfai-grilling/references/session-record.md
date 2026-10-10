# Recording a session

The work-orders table a session writes when it dispatched a lookup, and what
the reviewer of the invoking stage confirms about the session.

## Work Orders Summary

Use the shared schema from
`.qfai/assistant/rule/shared-skill-delegation-baseline.md`, including the
`Agent instance` column.

| Step | Role (sub-agent) | Agent instance  | Task title                      | Input (refs)                    | Output (refs)                   | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ------------------------------- | ------------------------------- | ------------------------------- | ---------------------------- |
| 1    | Reviewer         | `<instance id>` | Read the facts a round waits on | Decision and what it depends on | The fact, and where it was read | PASS/REVISE                  |

## What the reviewer confirms

The invoking stage's reviewer confirms this about the session:

- no decision was recorded as the user's that the user did not answer, no
  critical decision was adopted without an actual user answer or an explicit
  applicable human authorization under the master's delegation conditions,
  and none was assumed that the
  assumption path excludes;
- every adopted decision has its `agents` row, and none of them adds what the
  request did not need;
- a fact taken as settled names where it was read;
- the session ended on its own condition or on the user's word, in one of the
  five endings `.agents/rules/grilling.md` names. Between agents a round budget
  bounds the rounds (`.qfai/assistant/rule/review-convergence.md`), and
  a session recorded as ended while a critical decision it escalated is still
  unanswered and lacks that recorded authority is the finding;
- for an explicitly delegated discussion, the actual user instruction, its
  scope and authority, actual author rounds and dissent, no open node or
  running lookup, all required consumed inputs, and actual end/authoring times
  are evidenced. `adopted` without these is not a passing session.

The reviewer works under these rules:

- Reviewer independence is defined normatively in
  `.qfai/assistant/rule/shared-skill-delegation-baseline.md#definition-independent-reviewer-normative`.
  An agent that answered a lookup in this session is disqualified from reviewing
  the facts it supplied.
- Reviewer checks the Drift Protocol, verifies alignment with `test-layers.md`,
  and treats ratios as signals, not gates.
- Reviewer returns only `PASS` or `REVISE`, with a concrete fix proposal on
  `REVISE`. A gate that could not be run at all is recorded as `PENDING`, which
  never counts as `PASS`.
