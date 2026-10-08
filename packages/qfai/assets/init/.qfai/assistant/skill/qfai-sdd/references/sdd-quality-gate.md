# SDD Quality Gate

The gate checks the story-tree files against their shipped templates, the document schemas that close those shapes, and the approved source. Record the result for each touched BF.

## Structure and records

- 01_policy/ contains the required policy files, and each fact in objective.md, initiative.md, principle.md, and tech.md has one home.
- Quality-gate commands occur only in the Standard commands section of <paths.contractsDir>/tech.md. Other files point there.
- 02_business-flow/business-flows.md indexes real BF directories. Each business-flow.md has exactly one Mermaid flowchart or sequenceDiagram, in `## Flow`.
- Each story directory holds exactly 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md.
- The story tree was written from its paired templates under ../templates/spec/ and holds no heading, section, content kind or history they do not show, as the `Document shapes` section of the spec traceability rules sets out.
- decisions.md and open-questions.md have four cells per row: ID, Content, Approach, Status. Existing rows changed only in Status.
- Each change the user approved, retirement included, has its `Change request:` decision row recording who approved it, when, and the option chosen. No row records a decision the agent took. Unanswered critical decisions have open-question rows and prevent completion.

## Traceability and contracts

- BF → US → AC → EX ← BR edges exist.
- Every AC is a Gherkin scenario with at least one EX. Every EX has exactly one existing AC-Ref.
- Every BR lives in its enforcing contract, cites at least one existing full EX ID, and every EX has a BR citation.
- A shared rule is defined once; no other contract restates or cites it.
- A contract names no implementation file, and each BR cites only EX IDs.
- Every contract file written has a contracts.md row from the same change.
- Every persisted attribute and state named by an AC, EX, or BR is realizable by its contract directly or through a stated join.
- Paired API and DB contracts agree on terminal states and error outcomes.
- Each changed DB contract was applied to a scratch database and its declared write paths were exercised as the contract artifact rules require. The result appears under Contract executability in the SDD repdence.
- UI work uses a product-owned DESIGN.md that parses and validates; a sample design is not adopted.

## Flow validation

For each BF written or changed, and each existing BF whose obligations depend on a contract-scoped change:

1. Run npx qfai validate --profile sdd --fail-on error --flow BF-NNNN.
2. Resolve errors in their owning source and rerun until error=0. A document that fails its schema is reshaped to its template, never extended to explain the failure.
3. Report the exact command, result, and validate log path per flow.
4. Review the finding families for ID grammar, EX-to-AC, BR-to-EX, contract index, and record rows. An error-free gate is necessary and does not prove product intent on its own.

Do not use a sibling's in-flight findings to hold or clear the current flow. Recheck a flow after a shared policy or contract edit that changes its obligations.

## Review and evidence

- A pre-draft grilling checkpoint ran before the first write of every design-writing stage entered, and each critical decision it held was put to the user.
- The final report lists each decision a checkpoint adopted, with its reason.
- Reviewers are independent of authors, and every finding of the one review is fixed or answered under `.qfai/assistant/rule/review-convergence.md`, with no re-review.
- Evidence records the source, changed IDs and files, contract executability, commands, reviewer verdicts, rejected options excluded, and remaining risks.
- No approval-required operation is treated as approved from silence, --auto, or a generic instruction to continue.
