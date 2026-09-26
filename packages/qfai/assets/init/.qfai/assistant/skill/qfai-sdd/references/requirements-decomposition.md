---
id: requirements-decomposition
category: project
update_frequency: occasional
---

# Requirements Decomposition

Use source-backed discussion requirements to write one connected, testable story tree. The discussion pack supplies provenance and candidate decisions; the story tree and contracts hold the approved behavior.

## Source and ownership

1. Read the selected discussion pack's source registry, requirement index, open questions, decision record, and completed reviews. Each requirement must trace to a source ID. Record a missing source or unresolved product choice in `<paths.specsDir>/open-questions.md` and stop the dependent write.
2. Reuse an existing policy, business flow, or story when it still expresses the requirement. Record a create, update, or retirement operation in `<paths.specsDir>/decisions.md` with the affected BF or US and `discussion-<id>#REQ-NNNN`.
3. Write broad intent in `01_policy/`, then each observable process in `02_business-flow/business-flow-NNNN/business-flow.md`. Keep each flow's story index and three-file story directories beneath it.
4. Write one observable outcome per AC as a Gherkin scenario. Give each AC at least one concrete EX, and give each EX exactly one AC reference. Include normal, failure, boundary, and authorization paths relevant to the requirement.
5. Once the examples exist, write independently falsifiable BRs in the contracts that enforce them. Each BR cites at least one full EX ID; every EX has a BR. A shared BR is defined once and cited by other contracts.
6. Derive test obligations from the completed BF → US → AC → EX ← BR graph. The SDD skill records those obligations; `/qfai-atdd` authors the acceptance tests.

## Item size

- A BF is one end-to-end business process with a distinct outcome and Mermaid diagram.
- A US is one actor goal within a BF; its directory contains exactly `01_User-story.md`, `02_Acceptance-Criteria.md`, and `03_Example.md`.
- An AC is one independently observable outcome. Split outcomes that can pass or fail separately.
- An EX is one concrete input and expected result for exactly one AC. Split examples whose paths can pass or fail independently.
- A BR is one independently falsifiable constraint. If removing a clause leaves another complete rule, split it.

Allocate each ID as the highest ID of its kind in its defined scope plus one, counting retired IDs. Never reuse an ID. The scopes and widths are in `../SKILL.md#stage-1-triage-and-records`.

## Ambiguity

Leave unresolved choices in `open-questions.md` with an owner and a next action in Approach. Append decisions and questions once, then change only their Status. Do not silently turn discussion alternatives into requirements or duplicate a fact across policy, story, and contract files.
