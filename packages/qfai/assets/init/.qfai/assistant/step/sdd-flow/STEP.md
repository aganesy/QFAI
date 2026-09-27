---
name: sdd-flow
owner: qfai-sdd
purpose: "Write the policy and technology facts and the business flows the triage decided to change."
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
  `.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md`.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-phase-checklists.md#policy-and-business-flow`
  when editing.

## Writes

- `01_policy/objective.md`, `initiative.md`, `principle.md`, `constraint.md`
  and `glossary.md`.
- `03_contract/tech.md`.
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
   `principle.md` and `03_contract/tech.md`.
3. Write `tech.md` from its template: the stack in `## Stack`, Runtime and
   Platform rows included; each runtime dependency with its reason in
   `## Dependencies`; and the quality-gate commands, one labelled item each,
   only in the Standard commands section of `tech.md`. Other documents point
   there. `tech.md` holds no rules and no constraints: a rule goes to the
   contract that enforces it, a constraint to `01_policy/constraint.md`.
4. Write every file in its template's shape and nothing more, as
   `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md#document-shapes`
   states: policy holds criteria rather than definitions, and no section
   records history.
5. Carry the selected discussion pack into policy:

   | Discussion pack                                        | Story tree                                     |
   | ------------------------------------------------------ | ---------------------------------------------- |
   | `05_Scope.md` success criteria                         | `objective.md` `## Success criteria` rows      |
   | `05_Scope.md` out of scope                             | `objective.md` `## Non-goals`                  |
   | `08_Glossary.md` terms and abbreviations               | `glossary.md` `## Terms` rows                  |
   | `09_Constraints.md` technical and operational          | `constraint.md` technical and operational rows |
   | `09_Constraints.md` legal, budget and timeline entries | `constraint.md` `## Business Constraints` rows |

   A row takes the story-tree ID of its section, not the pack's ID, and only
   the columns its template has.

6. Create or update `02_business-flow/business-flows.md` and each affected
   `business-flow-NNNN/business-flow.md`. The index holds one row per flow —
   its ID, the title in its H1 after the ID, and its directory — and nothing
   else. The flow document holds its purpose as prose, exactly one Mermaid
   `flowchart` or `sequenceDiagram` under `## Flow`, and a list of its alternate
   and exception paths.
7. A flow and its user stories describe observable outcomes, not implementation
   steps.
8. Allocate BF IDs as
   `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#id-allocation`
   states, and add the new rows to the flow index.

## Skipped when

Inside a run, the plan may gate this step with `when: proposed`: a change that
touches no policy fact and no flow document leaves it out of the proposal.
