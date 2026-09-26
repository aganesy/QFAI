# SDD Quality Gate

The gate checks the story-tree files against their shipped templates and the approved source. Record the result for each touched BF.

## Structure and records

- 01_policy/ contains the required policy files, and each fact in objective.md, initiative.md, principle.md, tech.md, and structure.md has one home.
- Quality-gate commands occur only in the Standard commands section of <paths.contractsDir>/tech.md. Other files point there.
- 02_business-flow/business-flows.md indexes real BF directories. Each business-flow.md has a Mermaid flowchart or sequenceDiagram.
- Each story directory holds exactly 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md.
- The story tree was written from its paired templates under ../templates/spec/.
- decisions.md and open-questions.md have four cells per row: ID, Content, Approach, Status. Existing rows changed only in Status.
- Triage, change requests, retirement, and rejected options have decision rows. Unanswered critical decisions have open-question rows and prevent completion.

## Traceability and contracts

- BF → US → AC → EX ← BR edges exist.
- Every AC is a Gherkin scenario with at least one EX. Every EX has exactly one existing AC-Ref.
- Every BR lives in its enforcing contract, cites at least one existing full EX ID, and every EX has a BR citation.
- A shared rule is defined once; other contracts use file-level rule refs.
- Every contract file written has a contracts.md row from the same change.
- Every persisted attribute and state named by an AC, EX, or BR is realizable by its contract directly or through a stated join.
- Paired API and DB contracts agree on terminal states and error outcomes.
- Each changed DB contract was applied to a scratch database and its declared write paths were exercised as contract-artifact-rules.md requires. The result appears under Contract executability in the affected flow evidence.
- UI work uses a product-owned DESIGN.md and matching lock; a sample design is not frozen.

## Flow validation

For each BF written or changed, and each existing BF whose obligations depend on a contract-scoped change:

1. Run npx qfai validate --profile sdd --fail-on error --flow BF-NNNN.
2. Resolve errors in their owning source and rerun until error=0.
3. Record the exact command, result, and validate log path in .qfai/evidence/sdd-BF-NNNN.md.
4. Review the finding families for ID grammar, EX-to-AC, BR-to-EX, contract index, and record rows. An error-free gate is necessary and does not prove product intent on its own.

Do not use a sibling's in-flight findings to hold or clear the current flow. Recheck a flow after a shared policy or contract edit that changes its obligations.

## Review and evidence

- A pre-draft grilling session was recorded for every design-writing stage entered. A skipped checkpoint fails the gate.
- The flow evidence's `## Pre-draft Grilling` table names the stage, disposition, decision adjudicator, and timing before the first dependent write.
- The Work Orders Summary names the participants, decisions, and disposition.
- Reviewers are independent of authors and every routed blocking reviewer returned PASS.
- A REVISE finding was fixed and reviewed again under review-cycle-playbook.md.
- Evidence records the source, changed IDs and files, contract executability, commands, reviewer verdicts, rejected options excluded, and remaining risks.
- No approval-required operation is treated as approved from silence, --auto, or a generic instruction to continue.
