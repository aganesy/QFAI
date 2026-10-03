# qfai-run operator screens

What the user sees while a request is worked, and how a question reaches them.

## Every screen

- Relay it in the user's working language. The CLI's strings are English.
- `stop`, `off`, `shadow` and `active` stay as they are: the user types or
  reads them verbatim.
- Name stages in plain words. No route identifier, stage kind or internal ID.
- Show nothing while a call is running beyond the host's own activity
  indicator.

## The announcement

Once the plan is known, and before the first stage:

- the goal, in one sentence;
- the stages in order;
- the files the work may change.

It asks nothing and lists no skipped stage. Text that is not a request gets no
plan and no announcement.

## Questions

Put each question in the form `.agents/rules/user-questions.md` sets out.
Independent questions go in one round; a dependent one waits for its answer.

| Question               | How it is put                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The candidate question | One single-select option per candidate, two or three. Each is a short label and one sentence on what that route will change and check, with no route identifier |
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

## Halt notice

One notice when the work stops before its end:

- what stopped it, the one cause, and what clears it;
- for a finding no stage serves, the finding, its owner and the stage skill to
  invoke by name;
- for a stop, one line, with every open decision listed as open.

Recovery is a reverse diff limited to the paths the work wrote. Never offer a
reset, a stash, a branch switch or a worktree removal.

## Final report

| The work ended      | The report                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Every gate passed   | Done: the paths changed, each gate's verdict, and every decision taken without the user, with its reason |
| At a closing step   | The closure outcome and each follow-up request, never that a change is done                              |
| With a gate failing | Each failing gate marked pre-existing or new, with its owner. Nothing reads as complete                  |

- A gate shows its verdict only.
- An external effect nobody requested is listed as not requested.
- The report does not restate the history of the work.
- The report ends with a question listing the next actions, the recommended one
  first, as `.agents/rules/user-questions.md` § 6 sets out. Under a no-question
  mode it lists them instead.
