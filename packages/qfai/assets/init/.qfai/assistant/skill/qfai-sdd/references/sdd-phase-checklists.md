# SDD Phase Checklists

Use these checkpoints with the ordered stages in sdd-execution-playbook.md. A checked item requires evidence in the story tree or the SDD report.

## Source and triage

- The selected source is the preflight result's selectedInputPath, or an explicit user requirement named in the SDD report.
- The selected discussion pack and applicable completed reviews were read and dispositioned. A disagreement was resolved in an SDD-owned artifact.
- Every requirement has an affected policy, BF, US, EX, or contract path, or an open question that prevents a dependent write.
- Triage, change requests, retired stories, and rejected options are decision rows. Open questions are open-questions.md rows.
- Both tables have exactly ID, Content, Approach, Status. Existing rows are unchanged except Status.
- Approval-required rows have the user's decision before any dependent write. Under --auto, pending approvals stopped the run without an invented approval.
- New IDs use highest-in-scope plus one, including retired IDs in decision rows.

## Policy and business flow

- Files in 01_policy/ and 02_business-flow/ were copied from paired templates and hold their headings and nothing else, as spec-traceability-rules.md#document-shapes sets out. No section records history.
- Objective, initiative, principle, and tech state each fact in one place. Gate commands occur only in tech.md Standard commands.
- Every affected business-flow.md has exactly one Mermaid flowchart or sequenceDiagram in `## Flow`, and at least one alternate or exception path.
- business-flows.md and user-stories.md index actual flows and stories with their assigned BF and US IDs and the titles in their H1s after the ID, word for word.

## Stories and examples

- Each story directory has only 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md.
- Each AC is one named Gherkin Scenario under its ID comment, in the story's one gherkin block. No Scenario Outline.
- Each EX has exactly one existing AC-Ref. Each AC has one or more EX.
- Examples cover meaningful success, boundary, and kept-failure outcomes without inventing product rules.
- The story and example IDs follow their BF and US scopes and are never reused.

The one example a diagnosed missing test needs is appended as `.qfai/assistant/step/sdd-story/STEP.md#a-diagnosed-missing-test` states.

## Contracts and business rules

- Every BR lives in the contract that enforces it, is numbered `BR-<contract number>-NNNN`, and cites at least one existing full EX ID and nothing else.
- Every EX is cited by at least one BR. Shared rules are defined once, and no other contract cites them.
- Every contract declares a `<KIND>-NNNN` ID of its directory's kind, with a number no other contract uses, in a file named `<kind>-NNNN-<slug>.<ext>`.
- No contract names an implementation file.
- Every written contract file has a contracts.md index row in the same change, with the columns `ID`, `Title`, `File`, `Depends On`, `Reconciled With` and `Purpose`.
- Contract state, errors, and persisted attributes can realize the AC and EX outcomes, including required joins.
- Changed DB contracts were applied to a scratch database and their declared write paths exercised as contract-artifact-rules.md requires. Record the command and result under Contract executability in the SDD repdence.
- UI contracts follow the product's own root `DESIGN.md`; the sample design was not adopted.

## Concrete-abstract cycle

Follow concrete-abstract-cycle.md.

- A cycle ran when this invocation wrote or changed a BR Statement or Examples cell, and did not run otherwise or in an append stage.
- The finder is a sub-agent that wrote none of the BRs it read. The session agent decided each finding that is not critical.
- A finding resting on product intent nothing written states went to the user. A proposed EX that no existing BR, existing AC or the request implies was dropped.
- Each adopted change took the route its target's age allows, and the affected BRs were rewritten from their updated EXs.
- No more than two cycles ran, and a cycle that adopted nothing ended the loop. A finding still undecided at the end is one `Unadjudicated:` open-question row, and no other record was written.
- No decided finding, and none a declined change request answers, was raised again.

## Validation and review

- Every affected BF passed npx qfai validate --profile sdd --fail-on error --flow BF-NNNN with error=0.
- Every document written passes its document schema. A failure was fixed by reshaping the document, not by adding to it.
- The log path and result for each BF are in the SDD report.
- Reviewers are independent of the authors, and every finding of the one review is fixed or answered.
- Rejected options remain excluded, or a documented reopening decision exists.
- Remaining risks and next actions are explicit in the SDD report.
