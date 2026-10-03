# Reviewer Gate

This skill produces no artifact, so the gate that covers a session is the
invoking stage's. What it confirms about the session is:

- no decision was recorded as the user's that the user did not answer, no
  critical decision was adopted without them, and none was assumed that the
  assumption path excludes;
- every adopted decision has its `agents` row, and none of them adds what the
  request did not need;
- a fact taken as settled names where it was read;
- the session ended on its own condition or on the user's word, in one of the
  five endings `.agents/rules/grilling.md` names. Between agents a round budget
  bounds the rounds (`.qfai/assistant/rule/review-convergence.md`), and
  a session recorded as ended while a critical decision it escalated is still
  unanswered is the finding.

- Reviewer independence is defined normatively in
  `.qfai/assistant/rule/shared-skill-delegation-baseline.md#definition-independent-reviewer-normative`.
  An agent that answered a lookup in this session is disqualified from reviewing
  the facts it supplied.
- Reviewer checks the Drift Protocol, verifies alignment with `test-layers.md`,
  and treats ratios as signals, not gates.
- Reviewer returns only `PASS` or `REVISE`, with a concrete fix proposal on
  `REVISE`. A gate that could not be run at all is recorded as `PENDING`, which
  never counts as `PASS`.

A session run from the user-invoked entry point has no invoking stage. There the
gate is the user reading the record, which is why that entry point writes no
files.
