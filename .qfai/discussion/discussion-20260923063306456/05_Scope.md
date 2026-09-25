# 05 Scope

This pack is about what the `qfai` package defines for adopters: what `qfai init`
writes, what the skills do, what `qfai validate` enforces. It is not about
reorganising this repository's own `.qfai/`.

## In Scope

- The `.qfai/spec/` tree `qfai init` writes, replacing `.qfai/specs/`:

  ```text
  .qfai/spec/
  ├ decisions.md
  ├ open-questions.md
  ├ 01_policy/
  │  ├ objective.md
  │  ├ initiative.md
  │  ├ principle.md
  │  ├ glossary.md
  │  └ constraint.md
  ├ 02_business-flow/
  │  ├ business-flows.md
  │  └ business-flow-0001/
  │     ├ business-flow.md
  │     ├ user-stories.md
  │     └ user-story-0001-0001/
  │        ├ 01_User-story.md
  │        ├ 02_Acceptance-Criteria.md
  │        └ 03_Example.md
  └ 03_contract/
     ├ contracts.md
     ├ tech.md
     ├ structure.md
     └ api/ db/ ui/ cli/ design/
  ```

- Where each file's content comes from (Q20, accepted as proposed; SRC-0113):

  | Destination                                      | Source today                                                                                                                         |
  | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
  | `decisions.md`                                   | spec `07_Decisions`; spec `09_delta` (triage, decision log, change requests); `_policies/08`, `_policies/10`; `.qfai/decisions/CR-*` |
  | `open-questions.md`                              | spec `08_Open-questions`; `_policies/09`                                                                                             |
  | `01_policy/objective.md`                         | `_policies/01_Objective`; `catalog/product.md` (users, success, non-goals)                                                           |
  | `01_policy/initiative.md`                        | `_policies/02_Initiative`; `catalog/product.md` milestones                                                                           |
  | `01_policy/principle.md`                         | `catalog/manifest.md` (mission, axioms, judgment criteria); the generic part of `_policies/11_Slice-Policy`                          |
  | `01_policy/glossary.md`                          | `_policies/06_Glossary`                                                                                                              |
  | `01_policy/constraint.md`                        | `_policies/07_Constraints` (constraints, NFR floors)                                                                                 |
  | `02_business-flow/business-flows.md`             | replaces `_policies/03_Capabilities`: an overview of every flow, readable without opening a flow directory                           |
  | `business-flow-NNNN/business-flow.md`            | the per-flow part of `_policies/04_Business-Flow`, with its Mermaid diagram                                                          |
  | `business-flow-NNNN/user-stories.md`             | spec `02_User-stories` US Catalog: an overview of each story in the flow                                                             |
  | `user-story-NNNN-NNNN/01_User-story.md`          | the story body from spec `02`; scope and source REQ or discussion provenance from spec `01_Spec`                                     |
  | `user-story-NNNN-NNNN/02_Acceptance-Criteria.md` | spec `03_Acceptance-Criteria` (Gherkin)                                                                                              |
  | `user-story-NNNN-NNNN/03_Example.md`             | spec `05_Examples`; error and boundary cases that existed only in `06_Test-Cases`                                                    |
  | `03_contract/contracts.md`                       | `_policies/05_Contracts` (index)                                                                                                     |
  | `03_contract/tech.md`, `structure.md`            | `catalog/tech.md`, `catalog/structure.md`                                                                                            |
  | `03_contract/api/ db/ ui/ cli/ design/`          | `.qfai/contracts/**`; business rules from spec `04_Business-Rules`, written inside the contract file                                 |

- Layer meaning:
  - `01_policy`: the abstract basis for judgment — principles and criteria, no concrete definitions.
  - `02_business-flow`: the concrete layer — flows, then stories, then AC and EX — clarified exhaustively first.
  - `03_contract`: the abstract implementation layer, derived after `02`.
- The ID grammar, business-rule placement, test layers and test obligations in 06_REQ.md.
- The two project-wide tables, `decisions.md` and `open-questions.md`.
- The abolished artifacts: `01_Spec` (split into story `01` and contract NFR references), `_policies/03_Capabilities` and the CAP concept, `06_Test-Cases`, `10_Plan`, `16_Traceability-ledger`, `tdd/test-list.md`, `01_Spec-retired` (a retired story becomes a `decisions.md` row), `_policies/11_Slice-Policy` (generic part to `principle.md`), and `.qfai/decisions/`.
- The `qfai-sdd` order, concrete-first: 01 policy → 02 business flow → stories (US, AC, EX) → 03 contract with BRs. It replaces `Phase 0 Contracts-first` (SRC-0104).
- The assistant tree: `rule/` for rules shared by all work, skill-scoped files inside their skill, `process/` abolished, project-changed settings in `qfai.config.yaml`.
- Singular names for QFAI-owned directories.
- The `/qfai-migration-spec-to-story` skill and its bundled scripts.
- A `qfai validate` error on the old layout, naming the migration skill.
- The distributed-surface guards extended to the new internal ID shapes (REQ-0024).

## Out of Scope

- Reorganising this repository's own `.qfai/specs/` in this discussion. It lands with the cutover (deferred, OQ-0021).
- A `qfai migrate` CLI command. Migration is a skill with bundled scripts (Q12, Q19).
- A period in which both layouts are accepted. After the cutover the old layout is an error (Q12).
- Date and approver columns in `decisions.md` and `open-questions.md`. Git history carries dates; the user judged approver records worthless (Q6).
- Renaming host-defined directories: `.claude/skills`, `.agents/skills`, `.codex/skills`, `.github/skills`, `.github/workflows` and the like (Q11; `SKILL_INTEGRATION_DIRS`, SRC-0103).
- Renaming skill-internal convention directories: `references/`, `templates/`, `scripts/`, `mcp-templates/` (Q11).
- Changing contract IDs (`CON-API-0001` and the like) (Q3).

## Constraints

- Technical constraints: see 09_Constraints.md#Technical Constraints — mdschema SSOT, the `sync:ssot` mirror, distributed-surface guards, shipped CI parity.
- Operational constraints: see 09_Constraints.md#Operational Constraints — this repository's CI validates its own `.qfai/specs/`, and the version pin is the user's.
- Legal / compliance constraints: none beyond the package's existing license. The change adds no data collection and no network access.

## Success Criteria

> IDs use the `DSC-` prefix. Bare `SC-NNNN-NNNN` is reserved for the traceability
> scenario tag (`QFAI:SC-...`) and must not be used for a success criterion.

| Criterion | Measurement                                                                                | Target                                                                                                                                                      | Priority |
| --------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| DSC-001   | `qfai init` into an empty directory, then `qfai validate --fail-on error`                  | exit 0; no path under `.qfai/specs/` written                                                                                                                | must     |
| DSC-002   | One fixture per coverage rule (REQ-0007, REQ-0008, REQ-0010) that breaks exactly that rule | each fixture yields its error; 100% of rules                                                                                                                | must     |
| DSC-003   | Migrate a fixture on the old layout with `/qfai-migration-spec-to-story`, then validate    | 0 layout errors and 0 chain errors (REQ-0007, REQ-0008); every TC-only case, and every BF, AC and EX left without a test at its layer, listed in the report | must     |
| DSC-004   | Second migration run on the migrated fixture                                               | 0 files changed                                                                                                                                             | must     |
| DSC-005   | The three distributed-surface guards on the release candidate (SRC-0114)                   | 0 findings                                                                                                                                                  | must     |
| DSC-006   | `pnpm ci:gate` on the cutover commit, including the self-validate steps (SRC-0106)         | pass                                                                                                                                                        | must     |
| DSC-007   | `git check-ignore` on `.qfai/evidence/decision/` after migrating the fixture (NFR-0010)    | not ignored                                                                                                                                                 | must     |

## Assumptions

- Assumption 1: the sample tree `qfai init` writes stays small enough to act as the validate performance fixture in NFR-0005. No baseline is measured yet; the delivery team measures it in phase P1 before the first validator changes.
- Assumption 2: adopters run the migration from a clean git working tree, so git shows every change the scripts made. The skill does not enforce this; it is not in the request.
- Assumption 3: the placement of each multi-skill assistant file between `rule/` and a skill, as listed in REQ-0017, is a proposal. `/qfai-sdd` confirms it (OQ-0028).
