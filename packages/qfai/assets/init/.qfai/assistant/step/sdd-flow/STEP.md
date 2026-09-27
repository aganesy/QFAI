---
name: sdd-flow
owner: qfai-sdd
purpose: "Write the policy, technology and structure facts and the business flows the triage decided to change."
requires: [common-grilling-record]
roles: [requirements-analyst, solution-architect, product-experience-architect, completion-reviewer]
routing-profile: default
---

# sdd-flow

Stage 2 of the story tree: policy and business flows.

## Reads

- The triage rows `sdd-triage` appended, and the scope they approve. Write only
  that scope.
- The paired templates under
  `.qfai/assistant/skill/qfai-sdd/templates/spec/01_policy/`,
  `.qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/` and
  `.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/` (`tech.md`,
  `structure.md`).
- `.qfai/assistant/skill/qfai-sdd/references/sdd-phase-checklists.md#policy-and-business-flow`
  when editing.

## Writes

- `01_policy/objective.md`, `initiative.md`, `principle.md`, `constraint.md`
  and `glossary.md`.
- `03_contract/tech.md` and `03_contract/structure.md`.
- `02_business-flow/business-flows.md` and each affected
  `business-flow-NNNN/business-flow.md`.

Use the paired template for every file. Inside a workflow run, write only in
the attempt the operator's answer authorizes, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#inside-a-workflow-run`
states.

## Procedure

1. Run the pre-draft grilling checkpoint for `Policy and flows` in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` before
   the first write, and record it with `common-grilling-record`.
2. Write each fact once across `01_policy/objective.md`, `initiative.md`,
   `principle.md`, and `03_contract/tech.md`, `structure.md`.
3. Put the quality-gate commands only in the Standard commands section of
   `tech.md`; other documents point there.
4. Create or update `02_business-flow/business-flows.md` and each affected
   `business-flow-NNNN/business-flow.md`. Every flow document contains a Mermaid
   `flowchart` or `sequenceDiagram`.
5. A flow and its user stories describe observable outcomes, not implementation
   steps.
6. Allocate BF IDs as
   `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#id-allocation`
   states, and add the new rows to the flow index.

## Skipped when

Inside a run, the plan may gate this step with `when: proposed`: a change that
touches no policy fact and no flow document leaves it out of the proposal.
