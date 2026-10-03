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
  or EX changed, or in an `sdd_append` stage.
- **Finder.** A `test-design-analyst` that wrote none of those BRs reads them,
  the EXs they cite and the EXs this invocation wrote or changed. It raises
  findings of five kinds: a case the rule implies that no example states, a
  redundant example, an example no rule explains, a rule its examples do not
  support, and a flow, story or criterion split the rules show to be wrong.
- **Griller.** One per cycle, neither the finder nor an author of a targeted
  item. It puts the findings to the authors for at most two rounds, then adopts
  its recommendation on each finding that is not critical. A finding resting on
  product intent nothing written states goes to the user.
- **Scope.** A proposed EX must be implied by an existing BR, an existing AC or
  the request; otherwise it is rejected.
- **Applying.** An item this invocation wrote changes directly. An item that
  existed before changes only under an in-force `Change request:` row whose
  approved change covers the change. A BF or US split, merge, creation or
  retirement keeps its triage approval. Under `--contract`, a story change asks
  for a wider change request. Rewrite the affected BRs afterwards.
- **Stop.** At most two cycles; a cycle that adopts nothing ends the loop. A
  finding with no decision at the end becomes an `open-questions.md` row at TODO
  whose Content opens `Unadjudicated:`.
- **Rejected.** Each rejected finding is a REJECTED `decisions.md` row naming
  its kind, target IDs and case. A finding matching one by kind, target IDs and
  an equal, including or included case is not raised again, nor one a pending
  or declined change request already answers.

## Passes when

Read first: what `sdd-contract` wrote in this stage. The step passes when
`sdd-contract` wrote or changed no BR Statement and no Examples cell, which is
when no cycle runs. The pass names the contracts it read.

## Record

The SDD report's `## Concrete-Abstract Cycle` table holds the cycles, as
`.qfai/assistant/skill/qfai-sdd/references/concrete-abstract-cycle.md#the-record`
states. Where the concrete-abstract cycle ran, the completion reviewer returns
REVISE on the grounds in
`.qfai/assistant/skill/qfai-sdd/references/sdd-quality-gate.md#concrete-abstract-cycle-record`.

## Inside a workflow run

The cycle runs in the first attempt only:

1. The first attempt runs the cycle on its proposal before it asks the change
   question. That question shows the proposal as the cycle left it.
2. Each finding that goes to the user is a further `decision` question in the
   same `awaiting_input` result, beside the one change question. The attempt
   still writes nothing.
3. The attempt holding the answers runs no further cycle. It applies the answer
   to each finding the user decided, appends an `Unadjudicated:` row for each
   finding the user left open, appends the REJECTED rows, and writes the
   evidence rows of the cycles the first attempt ran. Its `Change request:` row
   names `decisions.md` and `open-questions.md` when it appended a row to them.
4. An adopted finding on an item outside the run's checked scope is upstream
   drift: no `Change request:` row, the item unchanged, and the stage returns
   `blocked`. `/qfai-sdd` invoked by name outside the run makes that change.
