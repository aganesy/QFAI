---
id: requirements-decomposition
category: project
update_frequency: occasional
---

# Requirements Decomposition

Use the answers of the deliberation record SDD consumes to write one connected, testable story tree. The record is history: it keeps the questions put to the user and the decisions agents took. The story tree and contracts hold the approved behavior.

## Source and ownership

1. Read every table of the record, with the completed reviews and the explicit user requirements. Record an unanswered Interview row or an unresolved product choice in `<paths.specsDir>/open-questions.md` and stop only the write that depends on it. Never edit the record.
2. Reuse an existing policy, business flow, or story when it still expresses the requirement. Put an operation that is a critical decision to the user, as the triage reference says, and record the decision in `<paths.specsDir>/decisions.md` only when it passes the recording test.
3. Write broad intent in `01_policy/` as criteria, then each observable process in `02_business-flow/business-flow-NNNN/business-flow.md`. Keep each flow's story index and three-file story directories beneath it. Every file takes its template's shape exactly, as the `Document shapes` section of the spec traceability rules sets out.
4. Write one observable outcome per AC, as one named Gherkin `Scenario:` under its ID comment. Give each AC at least one concrete EX, and give each EX exactly one AC reference. Include normal, failure, boundary, and authorization paths relevant to the requirement.
5. Once the examples exist, write independently falsifiable BRs in the contracts that enforce them. Each BR cites at least one full EX ID; every EX has a BR. A shared BR is defined once, in the contract that enforces it, and no other contract cites it.
6. Derive test obligations from the completed BF → US → AC → EX ← BR graph. The SDD skill records those obligations; `/qfai-implement` writes the acceptance tests.

## Where each answer goes

Write each answer of the record into the one story-tree file that owns it:

| The record settles                                                      | Written to                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Purpose, background, users and success                                  | `01_policy/objective.md`                                             |
| Assumptions, dependencies, milestones, size and what the work takes     | `01_policy/initiative.md`                                            |
| Risks                                                                   | `01_policy/initiative.md` `## Risks` rows                            |
| Trade-off priorities                                                    | `01_policy/principle.md` Decision priorities                         |
| Terms                                                                   | `01_policy/glossary.md`                                              |
| Technical, operational and business limits                              | the constraint sections of `01_policy/constraint.md`                 |
| Product-wide quality targets                                            | `01_policy/constraint.md` `## Quality targets` rows                  |
| Legal and compliance limits                                             | `01_policy/constraint.md` `## Legal and Compliance Constraints` rows |
| The target surfaces                                                     | the `03_contract/tech.md` `Surface` row                              |
| Flows and examples                                                      | the business flows, their stories and the EX rows of those stories   |
| Screens and their behaviour obligations                                 | the UI contracts under `<paths.contractsDir>/ui/`                    |
| The brand direction, references, rejected directions and trend findings | root `DESIGN.md`                                                     |
| A question still open                                                   | `<paths.specsDir>/open-questions.md`                                 |

A row takes the next ID of its section, which is its place in the table. It
keeps only the columns its template has, in plain words. Each answer has one
home: write it once, and point to it from nowhere else.

## Item size

- A BF is one end-to-end business process with a distinct outcome, drawn as one Mermaid diagram.
- A US is one actor goal within a BF, stated as one `As a <actor>, I want <goal>, so that <benefit>.` sentence; its directory contains exactly `01_User-story.md`, `02_Acceptance-Criteria.md`, and `03_Example.md`.
- An AC is one independently observable outcome. Split outcomes that can pass or fail separately.
- An EX is one concrete input and expected result for exactly one AC. Split examples whose paths can pass or fail independently.
- A BR is one independently falsifiable constraint. If removing a clause leaves another complete rule, split it.

A capacity-only sibling may represent the same actual actor goal within the
same BF when requested AC or EX additions exceed the source story's remaining
capacity. Prefer preserving published cases and IDs, and place only new,
cohesive incoming cases there, once the user has decided the partition. Confirm
retired-inclusive capacity before writing; this exception invents no new
product outcome and decides no future creation or move.

Allocate each ID as the highest ID of its kind in its defined scope plus one, counting retired IDs. Never reuse an ID. The scopes and widths are in the `ID allocation` section of the triage reference.

## Ambiguity

Leave unresolved choices in `open-questions.md` with an owner and a next action in Approach. Append decisions and questions once; a decision row keeps its ID and is never removed, though its wording may be restated, and a question row is never edited; delete a question row when a decision settles it.
Do not silently turn an option the user did not choose into a requirement, or duplicate a fact across policy, story, and contract files.
