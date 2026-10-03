---
name: sdd-cycle
owner: qfai-sdd
purpose: "Check the business rules against the examples they generalize, and apply what at most two cycles adopt."
requires: []
roles: [test-design-analyst, requirements-analyst, solution-architect, completion-reviewer]
routing-profile: default
---

# sdd-cycle

The concrete-abstract cycle. Between `sdd-contract` and `sdd-gate`, check the
rules against their examples. Follow
`.qfai/assistant/skill/qfai-sdd/references/concrete-abstract-cycle.md`.

## Rules

- **When.** A cycle runs when `sdd-contract` wrote or changed the Statement or
  the Examples cell of a BR. No cycle runs when it changed none, even if an AC
  or EX changed, or in an append stage.
- **Finder.** A sub-agent that wrote none of those BRs reads them, the EXs they
  cite and the EXs this invocation wrote or changed. It raises findings of five
  kinds: a case the rule implies that no example states, a redundant example,
  an example no rule explains, a rule its examples do not support, and a flow,
  story or criterion split the rules show to be wrong.
- **Deciding.** The session agent decides each finding that is not critical. A
  finding resting on product intent nothing written states goes to the user.
- **Scope.** A proposed EX must be implied by an existing BR, an existing AC or
  the request; otherwise the session drops it.
- **Applying.** An item this invocation wrote changes directly. An item that
  existed before changes only under an in-force `Change request:` row whose
  approved change covers the change, or on the user's approval. A BF or US
  split, merge, creation or retirement is put to the user. Under `--contract`,
  a story change asks for a wider change request. Rewrite the affected BRs
  afterwards.
- **Stop.** At most two cycles; a cycle that adopts nothing ends the loop. A
  finding still undecided at the end becomes one `open-questions.md` row at
  TODO whose Content opens `Unadjudicated:`. No other record is written.
- **Not raised again.** A finding matching one the session decided, by kind,
  target IDs and an equal, including or included case, is not raised again,
  nor one a declined change request already answers.

## Passes when

Read first: what `sdd-contract` wrote in this stage. The step passes when
`sdd-contract` wrote or changed no BR Statement and no Examples cell, which is
when no cycle runs. The pass names the contracts it read.
