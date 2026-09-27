---
name: sdd-triage
owner: qfai-sdd
purpose: "Select the requirement source, classify each requirement against the story tree, and record the decisions, questions and approvals the later writes depend on."
requires: [common-steering-refresh, common-grilling-record]
roles: [delivery-planner, requirements-analyst, completion-reviewer]
routing-profile: default
---

# sdd-triage

Select the source, decide which part of the story tree each requirement
changes, and record that decision before anything depends on it.

## Reads

- The applicable `.qfai/assistant/rule/` files and the routed agent cards.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md`: the operation set,
  the approval boundary and the decision-row format.
- `.qfai/assistant/skill/qfai-sdd/references/requirements-decomposition.md` and
  `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md`.
- `.qfai/assistant/rule/change-classification.md`, the classification
  authority.
- The existing story tree: `01_policy/`, `02_business-flow/`, `03_contract/`,
  `decisions.md` and `open-questions.md` under `<paths.specsDir>`.

## Scope of the request

With no argument, triage all incoming requirements and edit the flows they
affect. Do not assume that every existing flow needs a rewrite. A BF argument
limits the requested work to that flow and its shared dependencies.

Inside a workflow run, the work order's `target` sets the scope instead. A work
order with no `target` is refused. It never runs the no-argument batch. A `flow`
target scopes the stage to that business flow, and its gate runs with
`--flow BF-NNNN` for it.

## Stage 0: source and preflight

1. Run `common-steering-refresh`.
2. Run `npx qfai sdd preflight` and use its `selectedInputPath`; a selected
   discussion pack may be older than the newest pack. Inside a run, the
   preflight readiness check runs in every attempt and is never served from the
   Stage 0 snapshot.
3. Read the pack, its completed reviews, explicit user requirements, and the
   existing story tree. A discussion pack is provenance and design input, not a
   normative SSOT. Record a discrepancy in an SDD-owned row or evidence; do not
   edit the pack to clear this stage.
4. Stop if no usable source exists or a product decision cannot be inferred
   safely. An imported tree without a discussion pack uses the import-lite
   evidence route in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-execution-playbook.md#stage-0-source-inventory`.

## Stage 1: triage and records

Classify each incoming requirement against existing policies, flows, stories,
and contracts. Keep a related active flow or story and update its affected
descendants when it still represents the requirement. Create a flow or story
only when the existing tree cannot represent it. Trace impact through BF → US →
AC → EX and every enforcing contract.

Record triage, change requests, retired stories, and rejected options as rows of
`<paths.specsDir>/decisions.md`; record unresolved questions in
`<paths.specsDir>/open-questions.md`. Every row has exactly
`ID | Content | Approach | Status`. Append rows only; afterwards change only
Status. A triage Content names the operation, affected BF or US, and its source
as `discussion-<id>#REQ-NNNN` when that source exists. A change request Content
begins `Change request:` and names the affected paths or IDs. Do not write a
second decision-record directory or a retired story file.

An approval-required row begins at TODO, moves to WIP on approval, or REJECTED
if declined. `--auto` asks no questions and never supplies its own approval;
stop before the dependent write and report pending approvals.

### UI-bearing flows

UI-bearing is a property of the affected flow, not of the files this run
happened to edit. Resolve it from the source's surface classification and the UI
contracts linked to that flow, and record it for each affected flow. Route
`product-experience-architect` during design and `product-surface-reviewer`
during review whenever either signal identifies the flow as UI-bearing.

## ID allocation

Allocate each new ID from the highest ID of its kind in scope plus one,
including retired IDs named in decisions rows. BF scope is project-wide; US
scope is its BF; AC and EX scope is their US; BR scope is all contracts; DEC and
OQ scope is their own table. Empty scopes begin at `0001`, or `01` for AC and EX
tails. This is a reading rule over the tree, not a new command.

## Pre-draft grilling

Before this step's first mutation, run the checkpoint for `Triage and records`
in `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` and
record it with `common-grilling-record`. Each later design-writing step runs its
own checkpoint the same way.

## Inside a workflow run

Stage 1 approvals, and the rule that a story-tree or contract file changes only
on the operator's answer given in this run, follow
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#inside-a-workflow-run`.
Every later step of the stage writes under that rule.

Under `--auto` inside a run, an approval-required row with no satisfying
`human_decision` stops Stage 1: the row never reaches WIP, nothing that depends
on it is written, and the stage reports the row with its operation and target.
`--auto` approves nothing.

## Gate

`delivery-planner` accepts the affected-flow scope and approval state before any
drafting step starts. Every requirement has a target, an approved or
approval-free operation and a recorded impact path, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#completion-of-triage`
states.
