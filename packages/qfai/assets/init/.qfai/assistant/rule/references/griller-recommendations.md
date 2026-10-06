# Griller Recommendations

Read when a griller's recommendation is used.

## A griller's recommendations, and what they disqualify

A grilling session puts a recommended answer beside each question (`.agents/rules/grilling.md`). Who settled the decision decides what happens next.

| The decision was settled                              | What follows                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| By the user, from the recommendation among the inputs | The decision is theirs. The griller may review the artifact                       |
| Agent to agent, not critical                          | The decision stands. The griller that recommended it does not review the artifact |
| Agent to agent, critical, with no user adjudication   | The artifact is wrong, and no reviewer can clear it                               |

**The second row is how a delegated session is meant to end** (`.agents/rules/grilling.md`), not a finding. The reviewer checks that the decision is in the final report and is not critical. A reviewer that doubts its merit raises that as an ordinary finding against the artifact, under its own remit, as it would for any other content.

**The third row is not a routing problem.** A critical decision is the user's in every session, and a run that could not ask records it as an open question rather than adopting it. An agent-adopted critical decision is therefore an artifact carrying something nobody with the standing decided, and handing it to a different reviewer would launder it.
The reviewer must return `REVISE` and name the decision: it is reopened and put to the user, or recorded open where no question can be asked.

The first row needs a reason, because the intuitive one is wrong. A sub-agent starting with a reset context cannot defer to something it does not remember, so deference is not the risk. **Correlation** is: a fresh instance of the same agent, on the same model, over the same evidence, re-derives the preference that produced the recommendation and finds it good on the merits. Resetting the
context removes the memory, not the disposition — which is why role name alone never establishes independence either. Where the user chose, that disposition is one input among several and the decision is not the griller's to re-derive.

**The stage's final report is the record.** It lists every decision the agents adopted and the agent that recommended it, so a reviewer with a reset context reads the third row off the report rather than off recollection.
