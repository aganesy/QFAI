---
name: qfai-sdd
title: QFAI SDD (Story Tree)
description: "Use when invoked by name or handed a QFAI work order. Triages requirements and writes policy, business flows, stories, examples and enforcing contracts."
argument-hint: "[<BF-ID-or-name>] [--contract <CON-ID-or-path>] [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    requirements-analyst,
    solution-architect,
    test-design-analyst,
    qa-strategist,
    completion-reviewer,
    architecture-reviewer,
    product-experience-architect,
    product-surface-reviewer,
    qa-gatekeeper,
  ]
routing-profile: default
mode: approval-gated
---

<!-- The shipped body is the SSOT; host wrappers only link here. -->

## /qfai-sdd

[DRIFT-PROTOCOL:MANDATORY]

Inside an `npx qfai workflow` run, follow `references/orchestrated-mode.md`.

## User Questions (AskUserQuestion Protocol)

Agents MUST follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`
for every user question. With `--auto`, they MUST ask nothing and record
explicit assumptions in the stage evidence.

## Purpose and order

Turn a requirement into a checkable story tree. The fixed writing order is:

1. `01_policy/`: objective, initiative, principles, constraints, and glossary.
2. `02_business-flow/`: the flow index and each `business-flow-NNNN/business-flow.md`.
3. Each flow's `user-stories.md` and each `user-story-NNNN-NNNN/` with `01_User-story.md`, `02_Acceptance-Criteria.md`, and `03_Example.md`.
4. `03_contract/` and the files under `<paths.contractsDir>`. Write BRs in the contract that enforces them, citing EXs already written.

`decisions.md` and `open-questions.md` record decisions throughout the pass. Use the paired template under `templates/spec/` for every story-tree file. Do not create another document inside a story directory. The detailed sequence is in `references/sdd-execution-playbook.md`; use `references/sdd-phase-checklists.md` when editing.

With no argument, triage all incoming requirements and edit the flows they affect. Do not assume that every existing flow needs a rewrite. A BF argument limits the requested work to that flow and its shared dependencies.

## Stage 0: source and preflight

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`. Run
`npx qfai sdd preflight` and use its `selectedInputPath`; a selected discussion pack may be older than the newest pack.
Read the pack, its completed reviews, explicit user requirements, and existing story tree. A discussion pack is
provenance and design input, not a normative SSOT. Record a discrepancy in an SDD-owned row or evidence; do not edit the
pack to clear this stage. Stop if no usable source exists or a product decision cannot be inferred safely. An imported
tree without a discussion pack uses the import-lite evidence route in `references/sdd-execution-playbook.md`.

Read the applicable `.qfai/assistant/rule/` files, routed agent cards, `references/requirements-decomposition.md`, `references/spec-traceability-rules.md`, `references/contract-artifact-rules.md`, and `references/sdd-triage.md` before writing. For UI work also read `references/ui-contract-guide.md`. The classification authority is `.qfai/assistant/rule/change-classification.md`.

## Stage 1: triage and records

Classify each incoming requirement against existing policies, flows, stories, and contracts. Keep a related active flow
or story and update its affected descendants when it still represents the requirement. Create a flow or story only when
the existing tree cannot represent it. Trace impact through BF → US → AC → EX and every enforcing contract. Follow
`references/sdd-triage.md` for the operation set, approval boundary, and decision-row format.

Record triage, change requests, retired stories, and rejected options as rows of `<paths.specsDir>/decisions.md`; record
unresolved questions in `<paths.specsDir>/open-questions.md`. Every row has exactly `ID | Content | Approach | Status`.
A `decisions.md` row's Approach takes the form stated at the top of `templates/spec/decisions.md`.
Append rows only; afterwards change only Status. A triage Content names the operation, affected BF or US, and its source
as `discussion-<id>#REQ-NNNN` when that source exists. A change request Content begins `Change request:` and names the
affected paths or IDs. Do not write a second decision-record directory or a retired story file. An approval-required row
begins at TODO, moves to WIP on approval, or REJECTED if declined. `--auto` asks no questions and never supplies its own
approval; stop before the dependent write and report pending approvals.

Allocate each new ID from the highest ID of its kind in scope plus one, including retired IDs named in decisions rows. BF scope is project-wide; US scope is its BF; AC and EX scope is their US; BR scope is all contracts; DEC and OQ scope is their own table. Empty scopes begin at `0001`, or `01` for AC and EX tails. This is a reading rule over the tree, not a new command.

## Stage 2: policy and flows

Write each fact once across `01_policy/objective.md`, `initiative.md`, `principle.md`, and `03_contract/tech.md`,
`structure.md`. The quality-gate commands belong only in the Standard commands section of `tech.md`; other documents
point there. Create or update `02_business-flow/business-flows.md` and each affected
`business-flow-NNNN/business-flow.md`. Every flow document contains a Mermaid `flowchart` or `sequenceDiagram`. A flow
and its user stories describe observable outcomes, not implementation steps.

## Stage 3: stories and examples

Write the story index and the three files of each affected story from their paired templates. State each AC as a Gherkin
scenario. Give each EX exactly one existing AC in its `AC-Ref` cell, and give each AC at least one EX. Preserve normal
outcomes and meaningful failure boundaries. Follow `references/spec-traceability-rules.md` and
`.qfai/assistant/rule/test-layers.md` when deriving the later BF/E2E, AC/API or Integration, and EX/other test
obligations. Do not author acceptance tests in this skill.

## Stage 4: contracts and rules

Write a BR only after the EX it cites exists. Every BR cites at least one full EX ID; every EX is cited by at least one
BR. The relation may be many-to-many. Put each BR in the contract that enforces it: `x-qfai-rules` in YAML or JSON,
`-- Rule` and `-- Examples:` in SQL, and a `## Rules` table in Markdown. A rule shared by contracts is defined once in
its authoritative contract; other contracts cite its ID through their file-level rule refs. Use
`references/contract-artifact-rules.md` for file types, realizability, cross-contract reconciliation, and DB
executability. Add a row to `<paths.contractsDir>/contracts.md` in the same change as every contract file written.

For a UI-bearing flow on a visual prototyping surface, complete the root `DESIGN.md` and design-lock checks in `references/ui-contract-guide.md` before finalizing design contracts. A CLI-only surface does not require a visual brand lock. Ask for missing brand intent; do not freeze a sample design.

UI-bearing is a property of the affected flow, not of the files this run happened to edit. Resolve it from the source's surface classification and the UI contracts linked to that flow. Route `product-experience-architect` during design and `product-surface-reviewer` during review whenever either signal identifies the flow as UI-bearing.

With `--contract <CON-ID-or-path>`, select the existing contract by ID or by a repository-relative path under
`<paths.contractsDir>`. An unknown target stops the run. Read every affected flow's existing AC and EX and the paired
contracts, then repair only the contract scope approved by the change request. Recompute affected flows after each
contract change until no new flow or contract write is found. Do not silently rewrite a story in this mode; ask for a
wider change request when only the story can move. A `confirm-only` change request stays read-only and stops on a
mismatch. An activated API contract without an owning flow remains planned until an owner is established.

## Concrete-abstract cycle

Between Stage 4 and the gate, check the rules against their examples. Follow `references/concrete-abstract-cycle.md`.

- **When.** A cycle runs when Stage 4 wrote or changed the Statement or the Examples cell of a BR. No cycle runs when it changed none, even if an AC or EX changed, or under `defect-example-seeding`.
- **Finder.** A `test-design-analyst` that wrote none of those BRs reads them, the EXs they cite and the EXs this invocation wrote or changed. It raises findings of five kinds: a case the rule implies that no example states, a redundant example, an example no rule explains, a rule its examples do not support, and a flow, story or criterion split the rules show to be wrong.
- **Griller.** One per cycle, neither the finder nor an author of a targeted item. It puts the findings to the authors for at most two rounds, then adopts its recommendation on each finding that is not critical. A finding resting on product intent nothing written states goes to the user.
- **Scope.** A proposed EX must be implied by an existing BR, an existing AC or the request; otherwise it is rejected.
- **Applying.** An item this invocation wrote changes directly. An item that existed before changes only under an in-force `Change request:` row whose approved change covers the change. A BF or US split, merge, creation or retirement keeps its triage approval. Under `--contract`, a story change asks for a wider change request. Rewrite the affected BRs afterwards.
- **Stop.** At most two cycles; a cycle that adopts nothing ends the loop. A finding with no decision at the end becomes an `open-questions.md` row at TODO whose Content opens `Unadjudicated:`.
- **Rejected.** Each rejected finding is a REJECTED `decisions.md` row naming its kind, target IDs and case. A finding matching one by kind, target IDs and an equal, including or included case is not raised again, nor one a pending or declined change request already answers.
- **In a run.** The first attempt runs the cycle and asks each finding for the user as a further `decision` question beside the change question. The answering attempt applies the answers and writes the records. Drift outside the checked scope returns `blocked`.

## Review, gate, and evidence

Use the routed roles and phase spans in `references/sdd-routing-phase-crosswalk.md`. Follow
`.qfai/assistant/rule/shared-skill-delegation-baseline.md`: the orchestrator integrates and does not draft or
self-review; an author cannot review the artifact it edited. Before a design-writing stage, use the pre-draft grilling
rule in `references/sdd-pre-draft-grilling.md`, and record the disposition. Use `references/review-cycle-playbook.md`
for reviewer cycles and `references/sdd-quality-gate.md` for the gate.

Record each design-writing stage's session in the flow evidence's `## Pre-draft Grilling` table before its first mutation. A skipped checkpoint fails the gate. Settle a critical question before the affected author writes. Record the adopted recommendation, its adjudicator, and any unresolved escalation in the Work Orders Summary and open-questions.md.

Run `npx qfai validate --profile sdd --fail-on error --flow BF-NNNN` for each BF written or changed. Resolve findings in
their owning source and rerun until `error=0`. A worker's flow gate does not include a sibling flow still being edited.
Complete the routed blocking reviewer cycle and retain the validate log path. Evidence for each affected flow is
`.qfai/evidence/sdd-BF-NNNN.md`, based on `templates/evidence/sdd-flow.md`, including source, changes, decisions, gate
result, reviewer results, and remaining risks. When no BF exists yet, say in the report what the stage waits on, record an
`open-questions.md` row for it, and do not claim DONE.

A contract-scoped change also gates every existing BF whose obligations depend on that contract, even when the BF file itself is unchanged. If the contract has no owning BF, say so in the report and record the pending ownership as an `open-questions.md` row; do not fabricate a flow result.

### Reviewer Gate

The routed independent reviewers check the affected flow and contracts,
source decisions, traceability, and the current review pack. Enforce the
Drift Protocol and `rule/test-layers.md` for every linked obligation.
Planning and coverage estimates are signals, not gates. The gate records
PASS or REVISE for the reviewed revision; an author does not review its own
artifact.

Where the concrete-abstract cycle ran, the completion reviewer returns REVISE
on the grounds in
`references/sdd-quality-gate.md#concrete-abstract-cycle-record`.

When a stage needs user input or cannot proceed, record the question as a row of `open-questions.md` and report what the stage waits on. Follow the gate-failure repair protocol in the shared operating baseline. Do not bypass a failed gate.

## Completion

Report the source selected, BF and US IDs touched, decision and OQ IDs, contract files and index rows, each per-flow validation result and log, independent reviewer verdicts, adopted grilling decisions, rejected options still excluded, and remaining questions. The next implementation route is `/qfai-atdd`; UI work may pass through `/qfai-prototyping` first.

## Default Autopilot Policy

- auto-decide: output formatting, ID numbering under the stated scopes, and an equivalent option supported by existing decisions.
- ask-user: approval-required change operations, destructive actions, version changes, scope expansion, and critical product decisions. In `--auto`, leave these pending without asking or self-approving.
- hard-required: a usable requirement source, an identifiable affected flow or an explicit decision to create one, and product brand intent when a visual design lock is required.

project_memory:

- The story-tree source is the paired file under `templates/spec/`; keep the shipped structure when writing project files.
- `03_contract/tech.md` is the only home for Standard commands; other story-tree files cite it.
- Write policy, flows, stories with AC and EX, then enforcing contracts with BR. A BR never cites an unwritten EX.
- The story tree has BF → US → AC → EX ← BR. Every EX cites one AC; every AC and BR has an EX; every EX has a BR.
- Rows of `decisions.md` and `open-questions.md` are append-only except Status. Retired IDs remain reserved.
- A contract file and its `contracts.md` row are one change. Shared rules have one authoritative definition.
- Gate each touched BF separately with `--flow BF-NNNN`; completion requires error-free validation and routed blocking reviewer PASS.
