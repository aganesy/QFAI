---
name: sdd-story
owner: qfai-sdd
purpose: "Write the stories, acceptance criteria and examples of each affected flow."
requires: []
roles: [requirements-analyst, test-design-analyst, qa-strategist, product-experience-architect]
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
- `.agents/rules/document-schema.md`, when writing or editing a story-tree document: start from
  its template and add no section the schema does not name.
- `.agents/rules/documentation-clarity.md`, when writing the prose this step produces.

## Writes

- Each affected flow's `user-stories.md`.
- Each affected `user-story-NNNN-NNNN/` with exactly `01_User-story.md`,
  `02_Acceptance-Criteria.md`, and `03_Example.md`, from their paired templates.
  Do not create another document inside a story directory.
- The `// QFAI:EX-NNNN-NNNN-NN` annotation line that maps an example to an
  existing test, as procedure item 9 states, and nothing else in a test file.

Write only what the user approved, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#a-change-to-the-story-tree`
states.

## Procedure

1. Run the pre-draft grilling checkpoint for `Stories and examples` in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` before
   the first write, and list each decision it adopted in the final report.
   Before planned AC/EX additions, read
   `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#capacity-before-writing`.
   Report the retired-inclusive remaining capacity and requested count, and
   stop an over-capacity batch before any dependent declaration.
   For an approved capacity-only sibling or actual move, read
   `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#capacity-partition`
   and its following complete-map procedure before the affected write.
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
   For each EX added, name in the stage report the contract rule that will
   cite it, or the contract that needs a new rule for it. `sdd-contract`
   writes the rule.
5. Preserve normal outcomes and meaningful failure boundaries.
6. Follow `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md`
   and `.qfai/assistant/rule/test-layers.md` when deriving the later BF/E2E,
   AC/API or Integration, and EX/other test obligations. Do not author
   acceptance tests in this step. Item 9's annotation line is not test
   authoring.
7. Retire a story by removing its directory under the change request that names
   it, and never recycle its IDs.
8. Where a decision replaced a claim, such as an input, a threshold or a
   count, search the whole story tree and the contracts for the old claim
   before finishing. List each hit in the stage report, with what it now
   says or why it stays. A hit in a contract is left to `sdd-contract`,
   which reports it.
9. Where an existing assertion already proves an example this step added or
   renumbered, add that example's `// QFAI:EX-NNNN-NNNN-NN` line to the test's
   annotation lines, directly before the test declaration it marks, in a
   selected non-E2E test file. Replace an old ID only on the test that proves
   the renumbered example, the incoming item a merge collision renumbered; a
   test of the item that kept the ID keeps its annotation. This is
   specification metadata, not a test repair: change no assertion body, add or
   remove no case, and keep the case count.
   List each annotated test in the stage report. An example no existing
   assertion proves stays unannotated for the implementation stage.

## Passes when

Read first: the triage decisions, and the `03_Example.md` of each story they
touch. The step passes when the change stays inside the documents that own the
truth, as `sdd-triage` recorded the owner, and adds and changes no example. The
pass names the owning document and says that no example is added or changed.

A pass is refused when the result adds, changes or removes an example.
