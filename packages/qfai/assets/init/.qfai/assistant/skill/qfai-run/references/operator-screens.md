# qfai-run operator screens

What the operator sees during a run, and how a question reaches them.

## Every screen

- Relay it in the operator's working language. The CLI's strings are English.
- `continue`, `stop`, `off`, `shadow` and `active` stay as they are: the
  operator types or reads them verbatim.
- Name stages in plain words. No route identifier, stage kind or internal ID.
- Show nothing while a call is running beyond the host's own activity
  indicator.

## The announcement

Once the plan is checked, and before the first stage:

- the goal, in one sentence;
- the stages in order;
- the write scope;
- when the request changes more than one flow, the part a later run makes.

It asks nothing and lists no skipped stage. Text that is not a request gets no
run and no announcement.

## Questions

Put each open question as `status` or `next` returns it, in the form
`.agents/rules/user-questions.md` sets out. Put independent questions in one
round; a dependent one waits for its answer. Relay each answer with `decision`,
carrying who answered.

| Question            | How it is put                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`            | Two options, create the story or not, each saying what follows, and a recommendation citing the evidence that no story represents it                                                                                                                           |
| `decision`          | The finding in at most two sentences, each option with its effect, how many may be chosen, and a recommendation                                                                                                                                                |
| A story-tree change | A `decision` question naming the files the stage would change and the proposed change, with the options to apply it or not                                                                                                                                     |
| `fact`              | A choice where the candidates can be listed, a plain request where they cannot. No recommendation                                                                                                                                                              |
| The route question  | One option per reading of the request, two or three. Each option is a short label and one sentence on what that route will change and check, with no route identifier. The recommendation stands on a line of its own, and the question says one may be chosen |

- Routing opens the route question when the request reads more than one way.
  Its options come in the order the decision rules reach them, and it
  recommends the main reading. Relay it as the CLI returns it; `qfai-run`
  chooses nothing between the readings while a question can be put.
- The announcement follows the answer to a question routing opened and does not
  repeat it.
- A refused answer is put again with the reason in one sentence.
- The operator's `stop` goes to `decision` at once, whether or not a question
  is open.
- Under a no-question mode, put no question. The run stays `awaiting_input`,
  and the halt notice names what is open.
- The route question is the exception. Under a no-question mode `qfai-run`
  answers it itself with `decision` and the first option, the reading the
  decision rules reach first, even where another is recommended. The run
  already carries the gates and review of every reading, and the completion
  report lists that choice as an assumption.

## Halt notice

One notice when the run is blocked, refused, failed or stopped:

- what stopped, the one cause or code, and what clears it;
- who can clear it, when the run is blocked;
- for a refused `start`, that no run was created;
- for a stopped run, one line, with every open decision listed as open.

Recovery is a reverse diff limited to the paths the run wrote. Never offer a
reset, a stash, a branch switch or a worktree removal.

## Completion report

After `finish`:

| `finish` says      | The report                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `qfai_done` met    | Done: the paths changed, each gate's verdict, and every decision adopted as an assumption                        |
| `working_tree` met | Changed and verified, never done, with the delivery conditions still unmet                                       |
| Unmet conditions   | Each condition once, with its owner, and each failing gate marked pre-existing or new. Nothing reads as complete |

- A gate shows its verdict only.
- An external effect nobody requested is listed as not requested.
- The report does not restate the run's history.
- The report ends with a question listing the next actions, the recommended one
  first, as `.agents/rules/user-questions.md` § 6 sets out. Under a no-question
  mode it lists them instead.
