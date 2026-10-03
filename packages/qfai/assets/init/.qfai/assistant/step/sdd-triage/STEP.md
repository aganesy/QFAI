---
name: sdd-triage
owner: qfai-sdd
purpose: "Select the requirement source, classify each requirement against the story tree, and record the decisions, questions and approvals the later writes depend on."
requires: [common-steering-refresh]
roles: [delivery-planner, requirements-analyst]
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

Inside a plan `qfai-run` follows, the business flow the request names, or the
one the session settles from the request, sets the scope. It never runs the
no-argument batch, and its gate runs with `--flow BF-NNNN` for that flow.

## Stage 0: source and preflight

1. Run `common-steering-refresh`.
2. Run `npx qfai sdd preflight` and use its `selectedInputPath`; a selected
   discussion pack may be older than the newest pack. Inside a run, the
   preflight readiness check runs in every attempt and is never served from the
   Stage 0 snapshot.
3. Read the pack, its completed reviews, explicit user requirements, and the
   existing story tree. A discussion pack is provenance and design input, not a
   normative SSOT. Record a discrepancy in an SDD-owned row or the SDD report; do not
   edit the pack to clear this stage.
4. Stop if no usable source exists or a product decision cannot be inferred
   safely. An imported tree without a discussion pack takes its source as
   `.qfai/assistant/skill/qfai-sdd/references/sdd-execution-playbook.md#stage-0-source-inventory`
   says.

## Stage 1: triage and records

Classify each incoming requirement against existing policies, flows, stories,
and contracts. Keep a related active flow or story and update its affected
descendants when it still represents the requirement. Create a flow or story
only when the existing tree cannot represent it. Trace impact through BF → US →
AC → EX and every enforcing contract.

Record in `<paths.specsDir>/decisions.md` only what the user approved: each
change request, and each critical decision the user made. Record unresolved
questions in `<paths.specsDir>/open-questions.md`. Every row has exactly
`ID | Content | Approach | Status`. Append rows only; afterwards change only
Status. A change request Content begins `Change request:` and names the
affected repository-relative paths; its Approach names the operation, the affected BF or US,
its source as `discussion-<id>#REQ-NNNN` when that source exists, and who
approved it, when, and the option chosen. A decision the agent took appends no
row, and a declined change appends none. Do not write a second decision-record
directory or a retired story file.

Put each approval-required operation to the user before anything depends on
it. `--auto` asks no questions and never supplies its own approval; stop
before the dependent write and report pending approvals.

### UI-bearing flows

UI-bearing is a property of the affected flow, not of the files this run
happened to edit. Resolve it from the source's surface classification and the UI
contracts linked to that flow, and record it for each affected flow. Route
`product-experience-architect` during design and `product-surface-reviewer`
during review whenever either signal identifies the flow as UI-bearing.

## Which surface owns the truth

When the request or the diagnosis names two surfaces that disagree — a
validator and the template it checks, a contract and the code, a record and
what was built — decide which one owns the truth before any later step writes.

1. Take the order the project has recorded, highest first:
   - an in-force `decisions.md` row that settles it;
   - the story tree and the contracts, over the code, tests and prose that
     implement them, as Article IV of `.qfai/assistant/rule/constitution.md`
     states;
   - between two surfaces of one rank, the one a policy row, a contract or a
     decision names as the source.
2. Record the owner, and the entry of that order that made it the owner, with
   the triage decision.
3. The surface that does not own the truth is the one that changes. Where that
   is code, tests or shipped prose, `implement-tdd` aligns it, and this stage
   changes no story-tree file for it.
4. Where nothing recorded settles the order, the owner is a decision at this
   step's decision point (below).

## A mechanism nothing runs

When the diagnosis finds a mechanism that exists but does nothing — a check no
lane runs, a field nothing reads, a rule no code enforces — decide whether it is
wired or retired:

- **Wire it** when a specification, a contract or a recorded decision still
  asks for what it does. The route continues.
- **Retire it** when nothing written asks for it any more, or the request says
  to remove it. Write nothing, and report `branch: { outcome: retire }`; on a
  route that declares it, the run moves to the route that removes it.

## Settled mode

A work order step with `mode: settled` applies a decision already recorded and
approved: the one the work order's `settled` field or the request cites.

- Read that record and the part of the story tree it names. Do not reopen,
  grill again or widen what it settles.
- Triage each requirement strictly within the record.
- An instruction that asks for more than the record settles — a new flow, a
  changed criterion, a behaviour the record never mentions — stops the step.
  Write nothing, and report `branch: { outcome: outside-record }`, which moves
  the work to `decide-design`.
- A citation that resolves to no in-force row stops the step: put the missing
  record to the operator as a question, and write nothing.

## At a decision point

Where the work order marks this step `decisionPoint: user`, each decision it
reaches — the owner, wire or retire, how to repair — is taken here:

- When the work order's `modifiers` hold `gate:user`, put each decision to the
  operator as a question, return `awaiting_input` and change nothing. The
  attempt holding the answers carries on.
- Otherwise take the decision, list it in the result's `adopted` as
  `{ step, decision, reason }`, and carry on.
- A critical decision goes to the operator either way: one that makes a
  specification, a contract or a recorded decision the losing side, one that
  cannot be taken back, such as removing a public command or key, or one resting
  on product intent nothing written states. The result also raises `gate:user`
  through `raise`, as `{ modifier, reason }`, for the rest of the run.

Invoked by name, record each such decision in the SDD report with whether
this step took it or the operator answered it.

## ID allocation

Allocate each new ID from the highest ID of its kind in scope plus one,
including retired IDs named in decisions rows. BF scope is project-wide; US
scope is its BF; AC and EX scope is their US; a contract number's scope is every
contract of every kind; BR scope is its contract, whose number the BR carries
(`BR-0002-0001` belongs to `API-0002`); DEC and OQ scope is their own table.
Empty scopes begin at `0001`, or `01` for AC and EX tails. This is a reading
rule over the tree, not a new command.

## Pre-draft grilling

Before this step's first mutation, run the checkpoint for `Triage and records`
in `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md`. Put
each critical decision it holds to the user, and list each decision it adopted
in the final report. Each later design-writing step runs its own checkpoint the
same way.

## A change to the story tree

A story-tree or contract file changes only on the user's approval, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#a-change-to-the-story-tree`
sets out. Every later step of the stage writes under that rule.

## Gate

`delivery-planner` accepts the affected-flow scope and approval state before any
drafting step starts. Every requirement has a target, an approved or
approval-free operation and a recorded impact path, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#completion-of-triage`
states.
