# qfai-run stage points

What `qfai-run` does at a step the plan marks with a release point, a decision point or a branch point.

## Release point

Before a step `releasePoint` names runs, ask the user to approve the release; where it is `end`, ask once the last stage's gates have passed, then rerun them over the approval's `decisions.md` row.
`verify-commit` runs after that, so the commit holds the approval. Nothing after it
runs without the approval, which authorizes no push, merge, tag or publication.

After approval at a handoff release point, `qfai-run` writes the required
approval row in `decisions.md` before `triage-handoff` runs. Every triage step
still changes no tracked file. No handed-off operation runs on the user's behalf.

## Decision point

At a step `decisionPoints` names, put each critical
decision to the user through the structured question tool before
changing anything that depends on it. A decision is critical when it contradicts a
specification, a contract or a recorded decision, cannot be taken back, or
rests on product intent nothing written states. Take every other decision
yourself, ask nothing, and list it with its reason in the final report.

## Branch point

When a step `branchPoints` names reports an outcome
paired with one route, move there; with several, to the one the step
names; with `decision-table`, to the route `plan --in` gives the step's
new extraction. Take the destination's plan with
`npx qfai workflow plan --route <route>` at once: no later step of this
route runs. Any other outcome continues the route. Before the third move
and every one after it, ask the user, naming the destination in plain
words; `stop` ends the work. From a scope that leaves stages out, ask before any move.
