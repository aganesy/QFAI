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

- The triage decisions `sdd-triage` made and the scope the user approved, and
  the flows `sdd-flow` wrote.
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

Write only what the user approved, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#a-change-to-the-story-tree`
states.

## Procedure

1. Run the pre-draft grilling checkpoint for `Stories and examples` in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` before
   the first write, and record it with `common-grilling-record`.
2. Write the story index and the three files of each affected story, each in
   its template's shape and nothing more, as
   `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md#document-shapes`
   states. The index's `Story` cell repeats the title in the story's H1, after
   its ID, word for word, and the story is one
   `As a <actor>, I want <goal>, so that <benefit>.` sentence.
3. State each AC as its ID comment and one named Gherkin `Scenario:` inside the
   story's one `gherkin` block. A `Scenario Outline:` is not an AC; write each
   case as its own EX instead.
4. Give each EX exactly one existing AC in its `AC-Ref` cell, and give each AC
   at least one EX. `Input` and `Expected` hold plain values, not Gherkin
   steps.
5. Preserve normal outcomes and meaningful failure boundaries.
6. Follow `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md`
   and `.qfai/assistant/rule/test-layers.md` when deriving the later BF/E2E,
   AC/API or Integration, and EX/other test obligations. Do not author
   acceptance tests in this step.
7. Retire a story by removing its directory under the change request that names
   it, and never recycle its IDs.

Inside a run, a `new_story` target's result reports one `bindings` entry per
slot, naming the flow and the stories it created.

## Passes when

Read first: the diagnosis or the triage decisions, and the `03_Example.md` of each
story they touch. The step passes in two cases, and the pass names both facts
it rests on:

- **In an append stage**, when an existing example already states the case the
  diagnosis matched. The pass cites that example, and no row is appended to
  `decisions.md`.
- **In an `sdd` stage**, when the change stays inside the documents that own
  the truth, as `sdd-triage` recorded the owner, and adds and changes no
  example. The pass names the owning document and says that no example is added
  or changed.

A pass is refused while no example states the append stage's case, and in an
`sdd` stage whose result adds, changes or removes an example.

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
- Append no row to `decisions.md`: the operation needs no approval.
- No concrete-abstract cycle runs.
