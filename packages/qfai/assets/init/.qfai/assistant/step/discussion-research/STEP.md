---
name: discussion-research
owner: qfai-discussion
purpose: "Open the run's stage evidence and record the research the interview reads."
requires: [common-evidence-record, common-steering-refresh]
roles: [delivery-planner, discovery-analyst]
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

- `.qfai/evidence/discussion-<YYYYMMDDhhmmssSSS>.md`: this run's stage
  evidence.

Nothing under `.qfai/discussion/`, and no steering file.

## Procedure

1. Open this run's stage evidence at
   `.qfai/evidence/discussion-<YYYYMMDDhhmmssSSS>.md` with
   `common-evidence-record`, under the run's own stamp, before anything else is
   written. Its first two records have no other home before the pack exists:
   this step's research summary, and the `## Grilling Session` row whose
   `Ended at` is written before the first pack file.
2. Run `common-steering-refresh`. Discussion owns no steering file, so a gap it
   finds is routed to its owner or recorded as an open question.
3. Run `.qfai/assistant/rule/research-first-protocol.md` before any other
   artifact is authored, and record its `research_summary` output in this run's
   stage evidence. Its `best_practices` and `anti_patterns` are inputs to every
   later step, not a late fill-in.

## Gate

**Nothing is written under `.qfai/discussion/` until an ending authorizes
authoring.** The pack under work is resolved by the greatest timestamp with no
completeness check, so a run cancelled during the session would leave a
one-file directory that every later validator and the `/qfai-sdd` preflight
read in place of the last complete pack. A cancellation would make the project
look broken.

**The pack opens under this step's stamp**, so this run's pack and this run's
evidence carry one name. A second stamp makes the two unpairable: a reader
holding the pack cannot say which record belongs to it, and a check for a run
that recorded nothing reports one that did.
