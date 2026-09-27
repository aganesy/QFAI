# Story-Tree Traceability Rules

The story tree makes business intent concrete before a rule is attached to an enforcing contract. The required chain is BF → US → AC → EX ← BR. A policy, index, or decision row cites an ID; it does not declare a second copy of the item.

## Layout and ownership

- <paths.specsDir>/01_policy/ owns objective, initiative, principles, constraints, and glossary.
- <paths.specsDir>/02_business-flow/business-flows.md indexes flow directories.
- Each business-flow-NNNN/ owns business-flow.md, user-stories.md, and its user-story-NNNN-NNNN/ directories.
- Each story directory contains exactly 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md, with no subdirectory.
- <paths.contractsDir>/ owns contracts.md, tech.md, structure.md, and concrete enforcing contracts. The 03_contract/ template mirrors this contract view.
- <paths.specsDir>/decisions.md and open-questions.md own decision and question rows. No other record tree is created.

Every story-tree file is based on its paired template under ../templates/spec/. Do not invent a replacement layout to solve a validation error.

## Identifier scopes

| Kind                 | Format          | Scope                                     |
| -------------------- | --------------- | ----------------------------------------- |
| Business flow        | BF-NNNN         | All business flows                        |
| User story           | US-NNNN-NNNN    | Its BF; first number equals the BF number |
| Acceptance criterion | AC-NNNN-NNNN-NN | Its US                                    |
| Example              | EX-NNNN-NNNN-NN | Its US                                    |
| Business rule        | BR-NNNN         | All contracts                             |
| Decision             | DEC-NNNN        | decisions.md                              |
| Open question        | OQ-NNNN         | open-questions.md                         |

Use highest existing number plus one in the scope. Count IDs named in retired-item decisions, so deletion never frees an ID. Empty scopes begin at 0001 or, for AC and EX tails, 01. Directory names match their BF and US IDs. Do not add a CLI allocator.

Moving a story to another flow changes its US ID and every child AC and EX ID. Update all indexes, contract citations, and decision references in the same change. Record the old IDs as retired so they cannot be issued again.

## Edge rules

1. business-flows.md cites each actual BF. Each business-flow.md states its BF once, gives its purpose, and contains at least one Mermaid flowchart or sequenceDiagram.
2. user-stories.md cites each US under that flow. A user story declares its US and its parent BF. Keep each observable outcome in its own story.
3. 02_Acceptance-Criteria.md states each AC as a Gherkin scenario under that US.
4. Each EX row in 03_Example.md has exactly one AC-Ref. It names an AC in that story. Every AC has at least one EX.
5. Each BR lives in an enforcing contract and cites one or more full EX IDs that already exist. Every EX is cited by at least one BR. Several BRs may cite an EX, and one BR may cite several EXs.
6. The authoritative contract defines a shared BR once. Other contracts cite its ID through file-level rule refs and do not restate the rule.

Do not substitute an AC for an EX in a BR citation. The examples are concrete evidence for the rule, and the required order leaves them available before rule authoring.

## Contract forms and index

YAML and JSON contracts put rules under x-qfai-rules. SQL contracts use -- Rule and -- Examples: lines. Markdown contracts use a ## Rules table. Each rule includes ID, statement, and full example IDs. File-level refs use x-qfai-rule-refs, -- Rule refs:, or Rule refs: as appropriate. Follow contract-artifact-rules.md and the contract's paired template for syntax.

Each contract file written has a contracts.md row in the same change. The index cites the file and its ID; it is not another rule definition. Confirm that a contract can realize each persisted attribute in its cited AC and EX directly or through a stated join. Reconcile paired contracts' state and error vocabularies.

## Test-layer handoff

Follow .qfai/assistant/rule/test-layers.md. A BF yields an E2E obligation; each AC yields an API or Integration obligation according to its observable boundary; EXs supply concrete examples and remaining layer obligations. The later acceptance-test skill authors tests. /qfai-sdd supplies unambiguous BF, AC, EX, and contract sources and does not create an execution ledger.

A justified exception is a decisions.md row whose Content opens Test exception: and names the BF, AC, or EX it exempts. Put the reason in Approach. Only a DONE exception is in force; it exempts that item alone, not its descendants. An ID that does not exist exempts nothing.

## Decision provenance and drift

Triage, change requests, retired stories, and rejected options are rows of decisions.md. Open questions are rows of open-questions.md. Both tables have ID, Content, Approach, Status, and only Status changes after append. The change request's Content begins Change request: and names its allowed paths or IDs. A rejected option remains REJECTED unless a later decision explicitly reopens it.

Use .qfai/assistant/rule/change-classification.md for Primary and Tags and references/requirements-decomposition.md for turning source requirements into concrete outcomes. Apply .qfai/assistant/rule/drift-protocol.md before accepting a direction that conflicts with a previous decision. Do not silently promote discussion material into a governing spec.

## Gate

For every BF written or changed, run npx qfai validate --profile sdd --fail-on error --flow BF-NNNN and inspect findings for the EX-to-AC, BR-to-EX, ID grammar, contract index, and decision-row families. Record the command and result in that flow's evidence. A clean gate does not replace human review of whether the outcome actually answers the source.
