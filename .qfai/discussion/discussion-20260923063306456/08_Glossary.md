# 08 Glossary

## Term Definitions

| Term                           | Definition                                                                                                                                                                                                    | Context                                             | Source                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| Business flow (BF)             | An ordered sequence of activities a user performs to reach an outcome. The top of the concrete layer; stories hang under it. ID `BF-0001`.                                                                    | `02_business-flow/business-flow-NNNN/`              | SRC-0113 (Q1, Q2); SRC-0010      |
| User story (US)                | One piece of user value inside a flow, testable on its own. ID `US-0001-0001`: flow number, then story number.                                                                                                | `user-story-NNNN-NNNN/01_User-story.md`             | SRC-0113 (Q2); SRC-0001          |
| Acceptance criterion (AC)      | A condition, in Gherkin, that a story must meet. ID `AC-0001-0001-01`.                                                                                                                                        | `02_Acceptance-Criteria.md`                         | SRC-0113 (Q2)                    |
| Example (EX)                   | One concrete case of an AC, with its inputs and outcome. Cites exactly one AC; cited by at least one BR. ID `EX-0001-0001-01`. Every test that is neither E2E nor an integration or API test annotates an EX. | `03_Example.md`                                     | SRC-0113 (Q2, Q4, Q14); SRC-0011 |
| Business rule (BR)             | A rule that summarises several examples, written inside the contract that enforces it. ID `BR-0001`, numbered across all contracts.                                                                           | `03_contract/**`                                    | SRC-0113 (Q3, Q17); SRC-0012     |
| Contract                       | A machine-checkable interface definition — API, DB, UI, CLI or design. ID unchanged, for example `CON-API-0001`.                                                                                              | `03_contract/api/`, `db/`, `ui/`, `cli/`, `design/` | SRC-0113 (Q3)                    |
| Decision (DEC)                 | A row in `decisions.md`: ID, Content, Approach, Status. Also holds triage records, change requests, retired stories and test exceptions. ID `DEC-0001`.                                                       | `.qfai/spec/decisions.md`                           | SRC-0113 (Q6, Q7, Q13)           |
| Open question (OQ, new layout) | A row in `open-questions.md`, same four columns. ID `OQ-0001`. Not the same as an OQ-ID in this discussion pack, which is scoped to the pack.                                                                 | `.qfai/spec/open-questions.md`                      | SRC-0113 (Q6)                    |
| Policy layer                   | `01_policy/`: the abstract basis for judgment — principles, criteria, constraints. Holds no concrete definition.                                                                                              | `.qfai/spec/01_policy/`                             | SRC-0113 (Q20); SRC-0008         |
| Concrete layer                 | `02_business-flow/`: flows, stories, criteria and examples, clarified exhaustively before contracts are written.                                                                                              | `.qfai/spec/02_business-flow/`                      | SRC-0113 (Q1, Q20)               |
| Contract layer                 | `03_contract/`: the abstract implementation layer, derived from the concrete layer.                                                                                                                           | `.qfai/spec/03_contract/`                           | SRC-0113 (Q20)                   |
| Concrete-first                 | The order in which the concrete layer is written before the contract layer. Replaces contracts-first in `qfai-sdd` (SRC-0104).                                                                                | `qfai-sdd`                                          | SRC-0113 (Q20); SRC-0001         |
| Contracts-first                | Today's `qfai-sdd` order, in which `Phase 0 Contracts-first` precedes outline and slices. Removed by this change.                                                                                             | `qfai-sdd/SKILL.md`                                 | SRC-0104                         |
| Capability (CAP)               | Today's grouping of work into one spec pack per capability, listed in `_policies/03_Capabilities.md`. Abolished.                                                                                              | `.qfai/specs/`                                      | SRC-0101                         |
| Test case (TC)                 | Today's row in `06_Test-Cases.md`. Abolished; a TC with no EX becomes an EX in migration.                                                                                                                     | `.qfai/specs/spec-*/06_Test-Cases.md`               | SRC-0105                         |
| Test exception                 | A `decisions.md` row that names the BF, AC or EX it exempts from its test obligation. How the row links to its item, and which statuses make it hold, are decided under OQ-0029.                              | `decisions.md`                                      | SRC-0113 (Q13)                   |
| Migration report               | The output of `/qfai-migration-spec-to-story` listing every case it converted and every case it could not.                                                                                                    | Migration skill                                     | SRC-0113 (Q12)                   |

## Abbreviations

| Abbreviation | Full Form              | Notes                                                    |
| ------------ | ---------------------- | -------------------------------------------------------- |
| BF           | Business flow          | New                                                      |
| US           | User story             | ID grammar changes to `US-NNNN-NNNN`                     |
| AC           | Acceptance criterion   | ID grammar changes to `AC-NNNN-NNNN-NN`                  |
| EX           | Example                | ID grammar changes to `EX-NNNN-NNNN-NN`                  |
| BR           | Business rule          | Moves into contracts                                     |
| DEC          | Decision               | Row in `decisions.md`                                    |
| OQ           | Open question          | Row in `open-questions.md`; in this pack, a register row |
| CAP          | Capability             | Abolished                                                |
| TC           | Test case              | Abolished                                                |
| CR           | Change request         | Becomes a `decisions.md` row                             |
| SSOT         | Single source of truth | —                                                        |

## Rules

- Terms must be used consistently across all discussion artifacts.
- "Validate" means `qfai validate`; "the old layout" means `.qfai/specs/` with `spec-*/` and `_policies/`.
