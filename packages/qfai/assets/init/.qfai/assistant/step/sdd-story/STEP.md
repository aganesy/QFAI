---
name: sdd-story
owner: qfai-sdd
purpose: "Write the stories, acceptance criteria and examples of each affected flow, or append the one example a diagnosed defect needs."
requires: [common-grilling-record, common-evidence-record]
roles:
  [
    requirements-analyst,
    test-design-analyst,
    qa-strategist,
    product-experience-architect,
    completion-reviewer,
  ]
routing-profile: default
---

# sdd-story

Stage 3 of the story tree: stories and examples.

## Reads

- The triage rows `sdd-triage` appended and the scope they approve, and the
  flows `sdd-flow` wrote.
- The paired templates under
  `.qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/`.
- `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md` and
  `.qfai/assistant/rule/test-layers.md`.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-phase-checklists.md#stories-and-examples`
  when editing.

## Writes

- Each affected flow's `user-stories.md`.
- Each affected `user-story-NNNN-NNNN/` with exactly `01_User-story.md`,
  `02_Acceptance-Criteria.md`, and `03_Example.md`, from their paired templates.
  Do not create another document inside a story directory.

Inside a workflow run, write only in the attempt the operator's answer
authorizes, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#inside-a-workflow-run`
states.

## Procedure

1. Run the pre-draft grilling checkpoint for `Stories and examples` in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` before
   the first write, and record it with `common-grilling-record`.
2. Write the story index and the three files of each affected story.
3. State each AC as a Gherkin scenario.
4. Give each EX exactly one existing AC in its `AC-Ref` cell, and give each AC
   at least one EX.
5. Preserve normal outcomes and meaningful failure boundaries.
6. Follow `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md`
   and `.qfai/assistant/rule/test-layers.md` when deriving the later BF/E2E,
   AC/API or Integration, and EX/other test obligations. Do not author
   acceptance tests in this step.
7. Record a retired story as a decision row and never recycle its IDs.

Inside a run, a `new_story` target's result reports one `bindings` entry per
slot, naming the flow and the stories it created.

## A diagnosed missing test

In a stage of kind `sdd_append`, which a diagnosis that found a missing example
opens, this step adds the one example the missing test needs, for behaviour an
existing AC already states:

- Append exactly one EX to the `03_Example.md` of the story that owns the AC the
  diagnosis matched. Its ID is the next free EX ID of that story, and its
  `AC-Ref` is that AC.
- Add the new EX ID to the Examples cell of the contract rule that already cites
  an example of that AC. The rule's Statement is unchanged.
- When the work order's `recordAreas` name no contract, because rules in several
  contracts cite that AC's examples, change no file. Return `blocked` with one
  `debts` entry owned by `operator` that names those contracts: which of them
  takes the new example is the operator's to settle.
- Add or change no US or AC, and no existing EX. Write or annotate no test: the
  new EX stays an example no test annotates.
- Record the appended EX as one `decisions.md` triage row naming UPDATE:APPEND,
  the story and the diagnosis as its source. The operation needs no approval, so
  the row cites no `human_decision`.
- `.qfai/evidence/sdd-BF-NNNN.md`, written with `common-evidence-record`,
  records the diagnosed defect and the run ID, and names no path under
  `.qfai/run/`.
- No concrete-abstract cycle runs, and the evidence gets no cycle row.
