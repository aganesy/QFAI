---
name: discussion-research
owner: qfai-discussion
purpose: "Record the research the interview reads."
requires: [common-steering-refresh]
roles: [delivery-planner, discovery-analyst, completion-reviewer]
routing-profile: default
---

# discussion-research

The first step of a discussion. Its output is an input to the interview, so it
runs before any decision is taken.

## Reads

- `.qfai/assistant/rule/research-first-protocol.md`
- The inputs `.qfai/assistant/skill/qfai-discussion/SKILL.md#inputs-priority`
  orders.

## Writes

The research summary, in the stage report. Nothing under `.qfai/discussion/`,
and no steering file.

## Procedure

1. Run `common-steering-refresh`. Discussion owns no steering file, so a gap it
   finds is routed to its owner or recorded as an open question.
2. Run `.qfai/assistant/rule/research-first-protocol.md` before any other
   artifact is authored, and report its `research_summary` output. Its `best_practices` and `anti_patterns` are inputs to every
   later step, not a late fill-in.

## Gate

**Nothing is written under `.qfai/discussion/` until an ending authorizes
authoring.** The pack under work is resolved by the greatest timestamp with no
completeness check, so a run cancelled during the session would leave a
one-file directory that every later validator and the `/qfai-sdd` preflight
read in place of the last complete pack. A cancellation would make the project
look broken.

**The pack opens under this run's stamp**, taken when this step starts.
