# Context Summary

Read when a context summary is written.

## Context Summary Contract

When context is summarized, preserve the requests, decisions and stage state
needed to continue.

Every summary that replaces earlier context keeps these six:

1. Difficulties that came up, and how each was resolved.
2. Options raised, tried or set aside, and why.
3. Everything asked for, decided, agreed, ruled out or established as a constraint — in the exact words.
4. Where things stand: what is covered, settled or complete.
5. What is still open, promised or expected next.
6. Details that are hard to reconstruct: names, numbers, dates, exact wording, references.

It also keeps the stage state. None of it can be recovered from the code, and a summary that keeps the six and drops it still misleads the next window.

| Stage state                                                                               | What goes wrong when it is dropped                                                                                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The execution ledger and the row in progress                                              | Finished rows are worked again, or a row in `red` is taken for untouched                                             |
| Every open question, with its ID and status                                               | A question stays open with nobody tracking it, or is answered twice                                                  |
| The clarification budget spent in this invocation, and the questions it was spent on      | The next window asks what the user already answered, or asks past the cap                                            |
| Every assumption recorded under `--auto` or after the budget ran out, with its label      | A labelled assumption is read back as a decision someone took                                                        |
| Whether the stage's review has run, and each finding's fix or answer                      | The review runs a second time, or an answered finding is raised again (`.qfai/assistant/rule/review-convergence.md`) |
| A grilling session's decision tree, its current frontier, and the answers already settled | An answered question is asked again, or a question is put before the one it depends on (`.agents/rules/grilling.md`) |

Keep what the user said close to their own words. Your own reasoning may be condensed to what it concluded, as long as nothing listed above is dropped. Be complete on these items even when that makes the summary longer.
