# SDD Phase Checklists

Use these checkpoints with the ordered stages in sdd-execution-playbook.md. A checked item requires evidence in the story tree or the flow evidence file.

## Source and triage

- The selected source is the preflight result's selectedInputPath, or an explicit user requirement recorded in evidence.
- The selected discussion pack and applicable completed reviews were read and dispositioned. A disagreement was resolved in an SDD-owned artifact.
- Every requirement has an affected policy, BF, US, EX, or contract path, or an open question that prevents a dependent write.
- Triage, change requests, retired stories, and rejected options are decision rows. Open questions are open-questions.md rows.
- Both tables have exactly ID, Content, Approach, Status. Existing rows are unchanged except Status.
- Approval-required rows have the user's decision before any dependent write. Under --auto, pending approvals stopped the run without an invented approval.
- New IDs use highest-in-scope plus one, including retired IDs in decision rows.

## Policy and business flow

- Files in 01_policy/ and 02_business-flow/ were copied from paired templates and retain their required headings.
- Objective, initiative, principle, tech, and structure state each fact in one place. Gate commands occur only in tech.md Standard commands.
- Every affected business-flow.md has a Mermaid flowchart or sequenceDiagram.
- business-flows.md and user-stories.md index actual flows and stories with their assigned BF and US IDs.

## Stories and examples

- Each story directory has only 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md.
- Each AC is a Gherkin scenario tied to one story.
- Each EX has exactly one existing AC-Ref. Each AC has one or more EX.
- Examples cover meaningful success, boundary, and kept-failure outcomes without inventing product rules.
- The story and example IDs follow their BF and US scopes and are never reused.

### Defect example seeding (`defect-example-seeding`)

Under a workflow work order of operation `defect-example-seeding`, the stage
adds the one example a diagnosed missing test needs, for behaviour an existing
AC already states:

- Append exactly one EX to the `03_Example.md` of the story that owns the AC the
  diagnosis matched. Its ID is the next free EX ID of that story, and its
  `AC-Ref` is that AC.
- Add the new EX ID to the Examples cell of the contract rule that already cites
  an example of that AC. The rule's Statement is unchanged.
- Add or change no US or AC, and no existing EX. Write or annotate no test: the
  new EX stays an example no test annotates.
- Record the appended EX as one `decisions.md` triage row naming UPDATE:APPEND,
  the story and the diagnosis as its source. The operation needs no approval, so
  the row cites no `human_decision`.
- `.qfai/evidence/sdd-BF-NNNN.md` records the diagnosed defect and the run ID,
  and names no path under `.qfai/run/`.

## Contracts and business rules

- Every BR lives in the contract that enforces it and cites at least one existing full EX ID.
- Every EX is cited by at least one BR. Shared rules are defined once and referenced by other contracts.
- Every written contract file has a contracts.md index row in the same change.
- Contract state, errors, and persisted attributes can realize the AC and EX outcomes, including required joins.
- Changed DB contracts were applied to a scratch database and their declared write paths exercised as contract-artifact-rules.md requires. Record the command and result under Contract executability in the flow evidence.
- UI design contracts use the product's frozen DESIGN.md; the sample design was not frozen.

## Validation and review

- Every affected BF passed npx qfai validate --profile sdd --fail-on error --flow BF-NNNN with error=0.
- The log path and result for each BF are in .qfai/evidence/sdd-BF-NNNN.md.
- Each entered design-writing stage has a pre-draft grilling checkpoint before its first mutation. A skipped checkpoint fails the gate; unanswered critical decisions remain open and block completion.
- Reviewers are independent of the authors and all routed blocking verdicts are PASS.
- Rejected options remain excluded, or a documented reopening decision exists.
- Remaining risks and next actions are explicit in evidence and the completion message.
