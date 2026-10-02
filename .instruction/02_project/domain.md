---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# Domain Overview (QFAI Toolkit)

QFAI supports discussion, story-tree authoring, contracts, tests, validation
and reporting.

## Main Components

- `.qfai/spec/01_policy/`: project objective, initiative, principle, glossary
  and constraints.
- `.qfai/spec/02_business-flow/`: business-flow index, BF directories, and
  their US, AC and EX files. This repository has four flows: development,
  pull request CI, workspace diagnosis, and spec-pack migration.
- `.qfai/spec/03_contract/`: contract index, technology stack and commands,
  and contracts grouped by kind. API, DB and UI contracts declare
  `QFAI-CONTRACT-ID: <KIND>-NNNN`, such as `API-0002`. A CLI contract
  declares `CLI-NNNN` in its H1 and is named `cli-NNNN-<slug>.md`.
- `.qfai/spec/decisions.md` and `open-questions.md`: project-wide decision and
  question tables.
- `.qfai/discussion/`: discussion packs, the optional upstream input to a spec.
- `.qfai/assistant/`: the assistant tree — `rule/`, `skill/`, `agent/`,
  `prompt/`, plus project-local `skill.local/` where needed.
- `.qfai/evidence/`: the per-run evidence a skill writes. It is local and
  ignored, and reviewers read it in the working tree.
- `.qfai/review/`: review packs.
- `.qfai/report/`: where `validate` and `report` write.
- `qfai.config.yaml`: paths, validation rules and output settings

## IDs and Traceability

The chain is `BF → US → AC → EX ← BR`. A BF contains stories; each EX names
one AC; each BR lives in a contract and cites one or more EX IDs.

| ID             | Declared in                                                |
| -------------- | ---------------------------------------------------------- |
| `BF-NNNN`      | `business-flow-NNNN/business-flow.md`                      |
| `US-NNNN-NNNN` | `business-flow-NNNN/user-story-NNNN-NNNN/01_User-story.md` |
| `AC-…-NN`      | `user-story-NNNN-NNNN/02_Acceptance-Criteria.md`           |
| `EX-…-NN`      | `user-story-NNNN-NNNN/03_Example.md`                       |
| `BR-NNNN`      | a contract under `.qfai/spec/03_contract/`                 |

Tests annotate BF in E2E, AC in integration or API, and EX in a selected
non-E2E test. `validate` checks IDs, links, layers and uncovered obligations.

Full grammar: `02_project/naming.md`.

For the detailed naming conventions, see `02_project/naming.md`.
