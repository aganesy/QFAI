# Griller Recommendations

Read when a griller's recommendation is used.

## A griller's recommendations, and what they disqualify

A grilling session puts a recommended answer beside each question (`.agents/rules/grilling.md`). Who settled the decision decides what happens next.

| The decision was settled                              | What follows                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| By the user, from the recommendation among the inputs | The decision is theirs. The griller may review the artifact                       |
| Agent to agent, non-critical or with recorded applicable human authority | The decision stands. The griller that recommended it does not review the artifact |
| Agent to agent, critical, without an actual user answer or recorded applicable authority | The artifact is wrong, and no reviewer can clear it |

**The second row is how a delegated session is meant to end**
(`.agents/rules/grilling.md`), not a finding. The reviewer checks the final
report and, for a critical decision, the actual
applicable user authority defined in
`.agents/rules/grilling.md#explicit-delegation-for-a-discussion`.
An explicit delegation covering reversible requested judgment is authority,
not an individual human option answer. The recommending griller remains
disqualified from reviewing an agent adoption. A reviewer that doubts its merit
raises an ordinary finding against the artifact under its own remit.

**The third row is not a routing problem.** Without an actual answer or
recorded applicable user authority, a critical decision stays open. A run that
cannot ask records it as an open question rather than adopting it. Agent
agreement cannot supply authority, and a different reviewer cannot repair its
absence. No-question mode alone authorizes no decision.
The reviewer must return `REVISE` and name the decision: it is reopened and put to the user, or recorded open where no question can be asked.

The first row needs a reason, because the intuitive one is wrong. A sub-agent starting with a reset context cannot defer to something it does not remember, so deference is not the risk. **Correlation** is: a fresh instance of the same agent, on the same model, over the same evidence, re-derives the preference that produced the recommendation and finds it good on the merits. Resetting the
context removes the memory, not the disposition — which is why role name alone never establishes independence either. Where the user chose, that disposition is one input among several and the decision is not the griller's to re-derive.

**The stage's final report is the record.** It lists every decision the agents adopted and the agent that recommended it, so a reviewer with a reset context reads the third row off the report rather than off recollection.
