# Story-Tree Traceability Rules

The story tree makes business intent concrete before a rule is attached to an enforcing contract. The required chain is BF → US → AC → EX ← BR. A policy, index, or decision row cites an ID; it does not declare a second copy of the item.

## Layout and ownership

- <paths.specsDir>/01_policy/ owns objective, initiative, principles, constraints, and glossary.
- <paths.specsDir>/02_business-flow/business-flows.md indexes flow directories.
- Each business-flow-NNNN/ owns business-flow.md, user-stories.md, and its user-story-NNNN-NNNN/ directories.
- Each story directory contains exactly 01_User-story.md, 02_Acceptance-Criteria.md, and 03_Example.md, with no subdirectory.
- <paths.contractsDir>/ owns contracts.md, tech.md (stack, architecture layers, dependencies and gate commands, with no rules), and concrete enforcing contracts. The 03_contract/ template mirrors this contract view.
- <paths.specsDir>/decisions.md and open-questions.md own decision and question rows. No other record tree is created.

Every story-tree file is based on its paired template under ../templates/spec/, in the shape [Document shapes](#document-shapes) sets out. Do not invent a replacement layout to solve a validation error.

## Document shapes

The paired template is the shape. The document schema for the path, under `assets/mdschema/story/` in the qfai package, closes it. A document is out of shape when it:

- has a heading the template does not have, or has the template's headings in another order. An optional section may be left out; none may be added;
- puts a second kind of content in a section: prose above a table, a note under a list, a second table or a second fenced block;
- carries history or metadata: a change-set, dated, legacy or version-marked section, or a `Parent:`, `Source:` or `Notes:` line. The git history and decisions.md hold that.

A table the template shows with no rows is complete with no rows. The rules below are the ones a template cannot show.

| Document                        | Rules the template cannot show                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every 01_policy/ file           | Criteria and intent, not definitions. A value set, a behaviour rule or a command belongs to the contract or tech.md that owns it, and policy links there. A business rule is a BR in a contract, never a policy line.                                                                                                                                     |
| objective.md                    | Each `## Users` item reads `<role>: <what the role does with the product>`. Each success criterion is a result someone can observe, and names how it is measured.                                                                                                                                                                                         |
| initiative.md                   | `## Initiative` is prose. Priorities belong in principle.md's `## Decision priorities`.                                                                                                                                                                                                                                                                   |
| principle.md                    | An axiom carries no key. The order in which concerns win a conflict is `## Decision priorities`, with 1 first.                                                                                                                                                                                                                                            |
| glossary.md                     | One `## Terms` table: a term and its definition. No finding code, file name, configuration key, value set, rule text, retired term or history; the definition links the contract that defines the thing. A distinction goes in the definition.                                                                                                            |
| constraint.md                   | All three sections stay, each one table of ID, Constraint and Rationale, which may have no rows. A row states the limit and its reason in plain words: no file name, command or configuration key, and no BR, EX, AC or contract ID. A constraint a contract enforces is written there as a BR; a layer boundary is a row of tech.md's `## Architecture`. |
| tech.md                         | `## Architecture` is one `mermaid` flowchart TD of the layers, then one table with a row per layer from the uppermost down: its responsibility, and the layers below it that it uses, or `-`. A layer is named, never located: no path, file name or command. See [Architecture](#architecture).                                                          |
| decisions.md, open-questions.md | Exactly one table and nothing else. Rows are appended; afterwards only Status changes.                                                                                                                                                                                                                                                                    |
| business-flows.md               | `Flow` is the title in the flow's H1, after its ID, and `Path` is `` `business-flow-NNNN/` ``. Rows are in ID order.                                                                                                                                                                                                                                      |
| business-flow.md                | `## Purpose` is prose only. `## Flow` is one `mermaid` block, a flowchart or sequenceDiagram, and nothing else. `## Alternate and exception paths` is one list of at least one item.                                                                                                                                                                      |
| user-stories.md                 | `Story` is the title in the story's H1, after its ID, word for word, and `Path` is `` `user-story-NNNN-NNNN/` ``. Rows are in ID order.                                                                                                                                                                                                                   |
| 01_User-story.md                | `## User Story` is one paragraph holding one sentence: `As a <actor>, I want <goal>, so that <benefit>.` What the story leaves out goes in the optional `## Non-goals` list.                                                                                                                                                                              |
| 02_Acceptance-Criteria.md       | One `gherkin` block: `Feature: <story title>`, then per AC its ID comment and one `Scenario:` named for its outcome. Two spaces indent the comment and the Scenario, four the steps. No `Scenario Outline:`, and no `# Parent:` comment.                                                                                                                  |
| 03_Example.md                   | One row per EX, in ID order. `AC-Ref` names one AC of this story. `Input` and `Expected` are plain values, not `Given`, `When` or `Then` steps.                                                                                                                                                                                                           |

## Architecture

The `## Architecture` section of tech.md is the project's layer map: which layers the code is divided into, what each is responsible for, and which layers each may import from.

A layer is a group of modules with a dependency direction. An upper layer may use the layers below it; a lower layer never knows an upper one.

The section holds two things, in this order:

1. One `mermaid` block, `flowchart TD`, with one node per layer and one `Upper --> Lower` edge per dependency, and nothing else. A node is an ID, or an ID with its label in square brackets when the layer's name is not an ID.
2. One table of Layer, Responsibility and Depends on, one row per layer, from the uppermost layer to the lowermost. Depends on names only layers in rows below its own, comma-separated, or `-` for none. Peers at the same height may come in any order.

`npx qfai validate` reports a Depends on that names a layer not below its row, and any node or edge the diagram and the table do not share.

| Question            | Answer                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Written from        | The technical decisions the discussion pack records and, in an existing codebase, its actual module layout and import directions. `/qfai-configure` fills it from the codebase; `/qfai-sdd` from the pack. |
| Read by             | `/qfai-implement`, to place new code and choose its imports; the architecture and implementation reviewers, to judge a change; `/qfai-sdd`, to add a layer when a contract needs one.                      |
| What it does        | Every new module belongs to one layer and imports only from the layers its row lists. A change that crosses a boundary is a review finding.                                                                |
| What it may enforce | A project may add an automated check of import directions that reads this table.                                                                                                                           |

The table holds no rule. A behaviour a layer must show is a BR in the contract that enforces it; the table says only where code lives and what it may depend on.

## Identifier scopes

| Kind                 | Format          | Scope                                                 |
| -------------------- | --------------- | ----------------------------------------------------- |
| Business flow        | BF-NNNN         | All business flows                                    |
| User story           | US-NNNN-NNNN    | Its BF; first number equals the BF number             |
| Acceptance criterion | AC-NNNN-NNNN-NN | Its US                                                |
| Example              | EX-NNNN-NNNN-NN | Its US                                                |
| Contract             | KIND-NNNN       | All contracts of every kind; its directory names KIND |
| Business rule        | BR-NNNN-NNNN    | Its contract; first number equals the contract number |
| Decision             | DEC-NNNN        | decisions.md                                          |
| Open question        | OQ-NNNN         | open-questions.md                                     |

Use highest existing number plus one in the scope. Count IDs named in retired-item decisions, so deletion never frees an ID. Empty scopes begin at 0001 or, for AC and EX tails, 01. Directory names match their BF and US IDs. Do not add a CLI allocator.

Constraint IDs are the exception. `TC-NN`, `OC-NN` and `BC-NN` in constraint.md are positional: each section numbers its rows from 01 in table order. No other document cites one, so a removed row closes the gap and the rows after it are renumbered. `npx qfai validate` reports a constraint ID that is not its row's place.

Moving a story to another flow changes its US ID and every child AC and EX ID. Update all indexes, contract citations, and decision references in the same change. Record the old IDs as retired so they cannot be issued again.

## Edge rules

1. business-flows.md cites each actual BF. Each business-flow.md states its BF in its H1, gives its purpose, and draws its main path as exactly one Mermaid flowchart or sequenceDiagram under `## Flow`.
2. user-stories.md cites each US under that flow. A user story declares its US in its H1. Its parent BF is the directory it sits in, and no line of the file restates it. Keep each observable outcome in its own story.
3. 02_Acceptance-Criteria.md states each AC under that US as an `# AC-NNNN-NNNN-NN` comment followed by exactly one Gherkin `Scenario:`.
4. Each EX row in 03_Example.md has exactly one AC-Ref. It names an AC in that story. Every AC has at least one EX.
5. Each BR lives in an enforcing contract and cites one or more full EX IDs that already exist. Every EX is cited by at least one BR. Several BRs may cite an EX, and one BR may cite several EXs.
6. The authoritative contract defines a shared BR once. Other contracts neither restate nor cite it.
7. References point one way. A BR cites only EX IDs, and only code and tests cite a BR. A contract never names an implementation file. A flow's contracts are the ones whose BRs cite its examples.

Do not substitute an AC for an EX in a BR citation. The examples are concrete evidence for the rule, and the required order leaves them available before rule authoring.

## Contract forms and index

YAML and JSON contracts put rules under x-qfai-rules. SQL contracts use -- Rule and -- Examples: lines. Markdown contracts use a ## Business rules table. Each rule includes ID, statement, and full example IDs. Follow contract-artifact-rules.md and the contract's paired template for syntax.

Each contract file written has a contracts.md row in the same change. The index cites the file and its ID; it is not another rule definition. Confirm that a contract can realize each persisted attribute in its cited AC and EX directly or through a stated join. Reconcile paired contracts' state and error vocabularies.

## Test-layer handoff

Follow .qfai/assistant/rule/test-layers.md. A BF yields an E2E obligation; each AC yields an API or Integration obligation according to its observable boundary; EXs supply concrete examples and remaining layer obligations. The later acceptance-test skill authors tests. /qfai-sdd supplies unambiguous BF, AC, EX, and contract sources and does not create an execution ledger.

A justified exception is a decisions.md row whose Content opens Test exception: and names the BF, AC, or EX it exempts. Put the reason in Approach. Only a DONE exception is in force; it exempts that item alone, not its descendants. An ID that does not exist exempts nothing.

## Decision provenance and drift

Triage, change requests, retired stories, and rejected options are rows of
decisions.md. Open questions are rows of open-questions.md. Both tables have
ID, Content, Approach, Status, and only Status changes after append. The change
request's Content begins Change request: and names its allowed
repository-relative paths. A rejected option remains REJECTED unless a later
decision explicitly reopens it.

A decisions.md row's Approach takes the form stated at the top of templates/spec/decisions.md.

Use .qfai/assistant/rule/change-classification.md for Primary and Tags and references/requirements-decomposition.md for turning source requirements into concrete outcomes. Apply .qfai/assistant/rule/drift-protocol.md before accepting a direction that conflicts with a previous decision. Do not silently promote discussion material into a governing spec.

## Gate

For every BF written or changed, run npx qfai validate --profile sdd --fail-on error --flow BF-NNNN and inspect findings for the EX-to-AC, BR-to-EX, ID grammar, contract index, and decision-row families. Record the command and result in that flow's evidence. A clean gate does not replace human review of whether the outcome actually answers the source.
