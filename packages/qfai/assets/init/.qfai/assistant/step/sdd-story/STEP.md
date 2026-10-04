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
   the first write, and list each decision it adopted in the final report.
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

## Passes when

Read first: the triage decisions, and the `03_Example.md` of each story they
touch. The step passes when the change stays inside the documents that own the
truth, as `sdd-triage` recorded the owner, and adds and changes no example. The
pass names the owning document and says that no example is added or changed.

A pass is refused when the result adds, changes or removes an example.
