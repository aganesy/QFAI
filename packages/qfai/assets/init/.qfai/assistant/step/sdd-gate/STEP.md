---
name: sdd-gate
owner: qfai-sdd
purpose: "Validate each affected business flow on its own and write its SDD evidence."
requires: [common-gate-run, common-evidence-record]
roles: [completion-reviewer, qa-gatekeeper]
routing-profile: default
---

# sdd-gate

The per-flow gate of the story tree, and the flow evidence the review reads.

## Reads

- `.qfai/assistant/skill/qfai-sdd/references/sdd-quality-gate.md`: what the
  gate checks.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-phase-checklists.md#validation-and-review`.
- `.qfai/assistant/skill/qfai-sdd/templates/evidence/sdd-flow.md`: the flow
  evidence shape.

## Which flows

- Each BF written or changed by the earlier steps.
- For a contract-scoped change, every existing BF whose obligations depend on
  that contract, even when the BF file itself is unchanged.

A worker's flow gate does not include a sibling flow still being edited.

## Procedure

For each flow:

1. Run `npx qfai validate --profile sdd --fail-on error --flow BF-NNNN` through
   `common-gate-run`.
2. Resolve findings in their owning source and rerun until `error=0`. Follow
   `.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`;
   do not bypass a failed gate.
3. Write `.qfai/evidence/sdd-BF-NNNN.md` from
   `.qfai/assistant/skill/qfai-sdd/templates/evidence/sdd-flow.md` with
   `common-evidence-record`: the source, changes, decisions, gate result and
   validate log path, reviewer results, and remaining risks.

## A flow that does not exist yet

When no BF exists yet, say in the report what the stage waits on, record an
`open-questions.md` row for it, and do not claim DONE. If a contract has no
owning BF, say so in the report and record the pending ownership as an
`open-questions.md` row; do not fabricate a flow result.

## Gate

Every affected flow passed with `error=0`, and its evidence holds the command,
the result and the log path. The review that follows reads that evidence.

## Review

The stage's review through `common-review-cycle` takes one affected flow at a
time, on the snapshot that passed validation:

- The target is the flow's policy, stories, examples, enforcing contracts,
  `contracts.md`, decisions and open questions, and
  `.qfai/evidence/sdd-BF-NNNN.md`. Every sibling flow a shared contract change
  affected is included.
- Reviewers check the BF → US → AC → EX ← BR edges, negative and boundary
  outcomes, contract realization, DB execution proof, decision and OQ state, and
  validation freshness.
- `completion-reviewer` is the terminal blocking reviewer. Route
  `architecture-reviewer` when a contract changed, `product-surface-reviewer`
  for a UI-bearing flow, and `qa-gatekeeper` when the gate evidence is in doubt.
- The flow's validate gate reads this flow's SDD pack, including an incomplete
  pack its request attributes to the flow when `summary.json` is absent. A
  sibling flow's in-flight pack neither clears nor blocks this flow.
- The flow evidence lists the findings, repairs, rerun commands and final
  blocking verdicts.
