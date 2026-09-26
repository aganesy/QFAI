# SDD Review Cycle Playbook

Use this file for independent review of each affected business flow and its shared dependencies. Apply .qfai/assistant/rule/review-convergence.md and the shared delegation baseline.

## Inputs

- Routed roles and profile from .qfai/assistant/rule/agent-selection.md.
- The flow's policy, BF, US, AC, EX, and enforcing contracts, with decisions.md and open-questions.md.
- The current .qfai/evidence/sdd-BF-NNNN.md and validate log.
- The footer from rcp_footer.md, included without rewriting its policy.

## Cycle

1. Select mandatory and conditional reviewers from routing. An author or editor of an artifact cannot independently review it.
2. Build a review_request.md for the current flow and revision. Name the source, changed IDs and paths, contract index rows, gate result, rejected options, and previous answered demands.
3. Dispatch reviewers with the footer. Require the shared response template, including Status (PASS/REVISE/PENDING), Authored/edited under review, and Recommended and unadjudicated.
4. Fix a blocking REVISE in its owning source, rerun the affected flow gate, and rerun that reviewer plus any reviewer whose scope changed. A pending response is not PASS.
5. Complete the cycle only when all routed blocking reviewers return PASS. Record the revision and verdicts in evidence.

Prior answered demands belong in the next cycle's request before dispatch. A localized fix need not rerun an unrelated reviewer. Do not self-approve or collapse a serialized verdict into prose.

## Review pack

- summary.json uses target.kind: flow and target.path for the business-flow-NNNN directory. The path and kind must agree.
- producer is sdd, with a matching Producer: sdd line in review_request.md. This separates the SDD pack from other producers' reviews.
- Accepted serialized reviewer statuses are PASS, FAIL, and NA. REVISE is an in-flight reviewer verdict and becomes FAIL only when the cycle summary is written.
- revision_form and revision identify the state reviewed, using the repository's review-pack revision rule. A stale verdict does not clear a changed flow.
- The flow-scoped SDD gate checks this flow's SDD pack, including an incomplete pack attributed by its request when summary.json is absent. A sibling flow's in-flight pack does not clear or block this flow.

## Required outputs

- review_request.md.
- One Rxx_<reviewer>.md per routed reviewer.
- summary.json for the completed cycle.
- Flow evidence that lists findings, repairs, rerun commands, and final blocking verdicts.
