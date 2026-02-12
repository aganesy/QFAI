# specs (Layered Spec Packs)

## Purpose

A **spec pack** is the delivery unit for one business initiative.
This layout uses layered files so reviewers can read top-down while authoring stays safe with lower-to-higher references only.

Spec packs are built in two stages:

- `/qfai-sdd-refinement` owns intent, requirements, examples, and traceability inputs.
- `/qfai-sdd-planning` owns the execution plan (`17_Plan.md`) after at least one user-story slice is grounded.

## Spec pack layout

Path:

```text
specs/spec-XXX/
```

Required files (review order):

| Prefix | File | Node type | Role |
| ------ | ---- | --------- | ---- |
| 01 | `01_Spec.md` | META | pack metadata, reading guide, SSOT declarations |
| 02 | `02_Objective.md` | OBJ | top intent, success metrics, decision policy |
| 03 | `03_Initiative.md` | INIT | in/out scope, assumptions, risks |
| 04 | `04_Capability.md` | CAP | capability hypotheses and KPI intent |
| 05 | `05_Business-flow.feature` | FLOW | business and interaction flow |
| 06 | `06_User-stories.md` | US | user-story hub |
| 07 | `07_Acceptance-criteria.md` | AC | completion criteria (testable what) |
| 08 | `08_Business-rules.md` | BR | invariant business logic |
| 09 | `09_Examples.feature` | EX | examples (Gherkin recommended) |
| 10 | `10_Test-cases.md` | TC | concrete test cases and code locations |
| 11 | `11_Contracts.md` | CON-INDEX | index to `.qfai/contracts/**` (non-SSOT) |
| 12 | `12_Glossary.md` | TERM | term definitions (SSOT) |
| 13 | `13_Constraints.md` | NFR | non-functional and operational constraints |
| 14 | `14_Decisions.md` | ADR | major decisions |
| 15 | `15_Open-questions.md` | OQ | unresolved questions with owners |
| 16 | `16_Traceability-ledger.md` | TRACE | traceability table (SSOT) |
| 17 | `17_Plan.md` | PLAN | how-to-execute plan (SSOT) |
| 18 | `18_delta.md` | DELTA | change log, adoption/rejection rationale, do-not notes |

Example tree:

```text
specs/
├── README.md
└── spec-001/
    ├── 01_Spec.md
    ├── 02_Objective.md
    ├── 03_Initiative.md
    ├── 04_Capability.md
    ├── 05_Business-flow.feature
    ├── 06_User-stories.md
    ├── 07_Acceptance-criteria.md
    ├── 08_Business-rules.md
    ├── 09_Examples.feature
    ├── 10_Test-cases.md
    ├── 11_Contracts.md
    ├── 12_Glossary.md
    ├── 13_Constraints.md
    ├── 14_Decisions.md
    ├── 15_Open-questions.md
    ├── 16_Traceability-ledger.md
    ├── 17_Plan.md
    └── 18_delta.md
```

## Authoring ownership

- Refinement outputs: `01` to `16`, `18`
- Planning output: `17`

Planning should finalize major execution details only after at least one US slice (`US -> AC -> BR -> EX -> TC -> TRACE`) is validated for feasibility.

## Reference direction rules

### Core rule

- **Upper to lower references are forbidden.**
- **Lower to upper references are allowed.**

Examples:

- Allowed: `07_Acceptance-criteria.md` references `06_User-stories.md`.
- Allowed: `09_Examples.feature` references `07_Acceptance-criteria.md`.
- Allowed: `10_Test-cases.md` references `07_Acceptance-criteria.md` and `09_Examples.feature`.
- Forbidden: `06_User-stories.md` embedding an AC inventory.

### Contracts rule

- `11_Contracts.md` is an index and not a source of truth.
- Contracts can be referenced from other layers.
- Contracts must not define upstream logic for specs; behavior stays in OBJ/INIT/CAP/FLOW/US/AC/BR/EX/TC/TRACE.

## Template sources

Use only the skill-local templates for SDD:

- Refinement:
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/01_Spec.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/02_Objective.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/03_Initiative.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/04_Capability.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/05_Business-flow.feature`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/06_User-stories.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/07_Acceptance-criteria.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/08_Business-rules.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/09_Examples.feature`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/10_Test-cases.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/11_Contracts.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/12_Glossary.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/13_Constraints.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/14_Decisions.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/15_Open-questions.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/16_Traceability-ledger.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/18_delta.md`
- Planning:
  - `.qfai/assistant/skills/qfai-sdd-planning/templates/spec-pack/17_Plan.md`

Legacy templates under `.qfai/templates/spec/` may remain for compatibility, but SDD ownership is the skill-local templates above.

## Examples format (`09_Examples.feature`)

`09_Examples.feature` must contain:

- Exactly one `Feature:` block.
- One or more `Scenario:` blocks under that feature.
- Scenario tags:
  - `@EX-XXXX` for example id
  - `@AC-XXXX` for linked acceptance criterion
  - `@layer-api`, `@layer-integration`, or `@layer-e2e` according to policy

Minimal pattern:

```gherkin
Feature: Examples for <spec>

  @EX-0001 @AC-0001 @layer-api
  Scenario: <title>
    Given ...
    When ...
    Then ...
```

## Traceability and SSOT notes

- `16_Traceability-ledger.md` is the traceability SSOT.
- `17_Plan.md` is the How SSOT.
- `11_Contracts.md` is an index only (non-SSOT).

## Checklist (refinement complete)

- [ ] Files `01` to `16` and `18` exist.
- [ ] No upper-to-lower references were introduced.
- [ ] For each AC, examples and test cases are present.
- [ ] Traceability rows can be followed back to objective intent.
- [ ] `09_Examples.feature` uses a single Feature and tagged Scenarios.

## Checklist (planning complete)

- [ ] `17_Plan.md` exists.
- [ ] Plan references at least one completed user-story slice.
- [ ] Risks, gates, and verification approach are explicit.
