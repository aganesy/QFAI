# qfai-run operator screens

What the user sees while a request is worked, and how a question reaches them.

## Contents

- Every screen
- Launcher recovery
- Executing a step
- The scope question
- The announcement
- Questions
- A step only a person can take
- Replies to a waiting step
- Halt notice
- Final report
- Work orders summary

## Every screen

- Relay it in the user's working language. The CLI's strings are English.
- `stop`, `off`, `shadow` and `active` stay as they are: the user types or
  reads them verbatim.
- Name stages in plain words. No route identifier, stage kind or internal ID.
- Show nothing while a call is running beyond the host's own activity
  indicator.

## Launcher recovery

Read this section if the canonical launcher is missing or its preflight fails,
before planning.

Use the project's package manager and declared install command in this checkout:

- If `package.json` declares `qfai`, install the project's dependencies here.
- If it does not, add `qfai` as a development dependency using that package manager.
- Repeat the launcher preflight. Plan only after it succeeds.

Never use a published, remote or cached QFAI launcher as a fallback.

## Executing a step

Read this section when a step is short or passes without edits.

Read `STEP.md` at the plan's path and follow its Procedure. Run only its declared
commands and pass its Gate.

A `passThrough` step first reads what its Passes when section names. If that
condition holds, write nothing and record the reason in the stage report.
Do not skip the step. The planned independent review still runs, even when the
step is only two lines.

## The scope question

The scopes are the plan's, or the chosen candidate's after the candidate
question. With two or more, put one single-select question before the first
stage:

- one option per scope, narrowest first and recommended, each naming the stages
  it runs in plain words;
- the host's free-text answer for any other choice.

Run only the chosen scope's stages, in plan order.

- A free-text answer runs the stages up to the last one it names, followed by
  the verify stages the narrowest scope would add to them.
- An answer asking for work no stage of the plan does stops the work before the
  first stage, naming that work.
- One scope, a plan with no scopes, and a branch destination's plan, however
  it was taken, ask nothing and run every stage.
- When the chosen scope leaves stages out, ask before every branch move, naming
  the destination in plain words; `stop` ends the work.
- A release point is asked only when the chosen scope holds its step, or for
  `end`, the route's last stage.

## The announcement

Once the plan and its scope are known, and before the first stage:

- the goal, in one sentence;
- the chosen stages in order;
- the files the work may change.

The announcement asks nothing and lists no skipped stage. Continue with the
policy check and the first stage in the same turn without waiting for a reply.
Text that is not a request gets no plan and no announcement.

## Questions

Put each question in the form `.agents/rules/user-questions.md` sets out.
Independent questions go in one round; a dependent one waits for its answer.

| Question               | How it is put                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The candidate question | One single-select option per candidate, one to three. Each is a short label and one sentence on what that route will change and check, with no route identifier |
| A critical decision    | The finding in at most two sentences, naming the specification, contract or recorded decision it touches, each option with its effect, and a recommendation     |
| A release approval     | What would be released, the options to approve it or not, and that approving pushes, merges, tags and publishes nothing                                         |
| A third branch move    | The destination in plain words, the options to move there or `stop`                                                                                             |
| A missing fact         | A choice where the candidates can be listed, a plain request where they cannot. No recommendation                                                               |

- The candidate options come in the order `plan` returns them, and the
  recommendation, the main reading, stands on a line of its own.
- When one missing value is all that blocks the plan, ask for it once, then
  plan. A discussion stage is added only where product scope, several design
  decisions or the user experience are open.
- The user's `stop` ends the work at once, whether or not a question is open.
- Under a no-question mode nothing is asked. `SKILL.md` says what is done
  instead.

## A step only a person can take

A change can depend on an action outside the repository that only the user can
take: a setting in a hosted dashboard, or a credential issued in a service's
web console. The plan stays the repository change. The work stops before the
stage that needs the action and says three things:

- what the user must do, in plain words, and where;
- what shows it was done;
- what the agent will read to check it, which changes nothing: a status page, a
  listing, a repository check.

Put it as one question that ends the turn, in the form
`.agents/rules/user-questions.md` sets out. The options are that the user did
it, and `stop`.

- The agent never types a password, token or key, and never changes an account
  or service setting. The user does both in the service's own page.
- The agent reads only the evidence it named. It reports the action as
  confirmed or not confirmed, and goes on after it only when confirmed or the
  user says to go on.
- Under a no-question mode nothing is asked. The work that does not depend on
  the action goes on, and the final report lists the action as not done.

## Replies to a waiting step

Read this section before treating a user's reply as a new request.

- A reply answering a pending question or reporting the requested operation's
  result resumes the same waiting step, including a reported failure. Use no
  new plan and no skill invocation for that reply.
- An independent new request is planned under the extraction and scope rules
  in `SKILL.md`. If a reply also contains one, resume the waiting step with its
  answer and plan the independent request separately.
- A separate explicit request to investigate the failure or repeat the operation
  is planned as a new request under those same rules.
- An answer to a closed request for information follows only the plan's branch
  for received information. Add no branch or step.
- For an ambiguous reply, do not assume success, completion, new facts or
  approval. State what remains unconfirmed. Ask for any fact or decision still
  needed under the normal question rules.

While an operation result is pending, use the interim-report exception in
`.agents/rules/user-questions.md` § 6 only under its stated conditions. Report
the current state, expected result and resume condition without repeating the
question. A completed route still follows the final-report rule below.

## Halt notice

One notice when the work stops before its end:

- what stopped it, the one cause, and what clears it;
- for a finding no stage serves, the finding, its owner and the stage skill to
  invoke by name;
- for a stop, one line, with every open decision listed as open.

Recovery is a reverse diff limited to the paths the work wrote. Never offer a
reset, a stash, a branch switch or a worktree removal.

## Final report

| The work ended                        | The report                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Every stage ran and every gate passed | Done: the paths changed, each gate's verdict, and every decision taken without the user, with its reason             |
| At the chosen scope                   | The chosen stages complete, the stages not chosen, and a verdict for each gate that ran, never that a change is done |
| At a closing step                     | The closure outcome and each follow-up request, never that a change is done                                          |
| With a gate failing                   | Each failing gate marked pre-existing or new, with its owner. Nothing reads as complete                              |

- A gate shows its verdict only.
- An external effect nobody requested is listed as not requested.
- The report does not restate the history of the work.
- The report ends with a question listing the next actions, the recommended one
  first, as `.agents/rules/user-questions.md` § 6 sets out. Under a no-question
  mode it lists them instead.

## Work orders summary

Read this section when parts ran in parallel. Report one row per part given to
a sub-agent.

| Step | Role (sub-agent) | Agent instance  | Task title        | Input (refs)  | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ----------------- | ------------- | ------------- | ---------------------------- |
| 1    | `<role>`         | `<instance id>` | `<part in words>` | The step file | The result    | PASS/REVISE                  |
