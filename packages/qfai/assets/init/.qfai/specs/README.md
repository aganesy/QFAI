# specs (Layered Spec Packs with Compatibility)

## Purpose

A **spec pack** is the delivery unit for one feature slice.

This repository currently runs validators and downstream skills on the legacy runtime files, while layered files provide structured authoring and review.

## Runtime compatibility contract (mandatory)

For each `spec-XXXX/`, keep these files present and coherent:

- `spec.md`
- `delta.md`
- `scenario.feature`
- `case-catalogue.md`
- `traceability-matrix.md`
- `plan.md`

Compatibility note:

- Current CLI discovery and validators read the file set above.
- `delta.md` is the guardrail/decision source consumed by runtime checks.
- `plan.md` is the How SSOT consumed by downstream execution skills.

## Layered authoring overlay

Layered files may coexist for top-down review:

| Prefix | File                        | Node type | Role                                                    |
| ------ | --------------------------- | --------- | ------------------------------------------------------- |
| 01     | `01_Spec.md`                | META      | pack metadata, reading guide, SSOT declarations         |
| 02     | `02_Objective.md`           | OBJ       | top intent, success metrics, decision policy            |
| 03     | `03_Initiative.md`          | INIT      | in/out scope, assumptions, risks                        |
| 04     | `04_Capability.md`          | CAP       | capability hypotheses and KPI intent                    |
| 05     | `05_Business-flow.feature`  | FLOW      | business and interaction flow                           |
| 06     | `06_User-stories.md`        | US        | user-story hub                                          |
| 07     | `07_Acceptance-criteria.md` | AC        | completion criteria (testable what)                     |
| 08     | `08_Business-rules.md`      | BR        | invariant business logic                                |
| 09     | `09_Examples.feature`       | EX        | examples (Gherkin recommended)                          |
| 10     | `10_Test-cases.md`          | TC        | concrete test cases and code locations                  |
| 11     | `11_Contracts.md`           | CON-INDEX | index to `.qfai/contracts/**` (non-SSOT)                |
| 12     | `12_Glossary.md`            | TERM      | term definitions (SSOT)                                 |
| 13     | `13_Constraints.md`         | NFR       | non-functional and operational constraints              |
| 14     | `14_Decisions.md`           | ADR       | major decisions                                         |
| 15     | `15_Open-questions.md`      | OQ        | unresolved questions with owners                        |
| 16     | `16_Traceability-ledger.md` | TRACE     | layered traceability ledger                             |
| 17     | `17_Plan.md`                | PLAN      | layered plan mirror (optional, keep in sync with plan)  |
| 18     | `18_delta.md`               | DELTA     | layered delta notes (optional, keep in sync with delta) |

## Directory rules

```text
specs/
├── README.md
└── spec-0001/
    ├── spec.md
    ├── delta.md
    ├── scenario.feature
    ├── case-catalogue.md
    ├── traceability-matrix.md
    ├── plan.md
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

- Refinement owns intent and what: legacy core files except `plan.md`, plus layered `01` to `16` and `18`.
- Planning owns how: `plan.md` (mandatory runtime SSOT), optionally mirrored to `17_Plan.md`.

## Reference direction rules (layered files)

- Upper-to-lower references are forbidden.
- Lower-to-upper references are allowed.

Examples:

- Allowed: `07_Acceptance-criteria.md` references `06_User-stories.md`.
- Allowed: `09_Examples.feature` references `07_Acceptance-criteria.md`.
- Allowed: `10_Test-cases.md` references `07_Acceptance-criteria.md` and `09_Examples.feature`.
- Forbidden: `06_User-stories.md` embedding AC inventory.

## Sync rule between runtime and layered files

When layered files are updated, keep runtime files synchronized:

- `08_Business-rules.md` -> `spec.md` BR/AC integrity
- `09_Examples.feature` -> `scenario.feature` SC/AC tags
- `10_Test-cases.md` -> `case-catalogue.md`
- `16_Traceability-ledger.md` -> `traceability-matrix.md`
- `17_Plan.md` <-> `plan.md`
- `18_delta.md` <-> `delta.md`

## Template sources

Legacy runtime templates:

- `.qfai/templates/spec/delta.md`
- `.qfai/templates/spec/plan.md`

Layered templates:

- `.qfai/assistant/skills/qfai-sdd-refinement/templates/spec-pack/*.md`
- `.qfai/assistant/skills/qfai-sdd-planning/templates/spec-pack/17_Plan.md`

## Checklist (refinement complete)

- [ ] Runtime files except `plan.md` exist and are coherent.
- [ ] Layered files `01` to `16` and `18` exist if layered mode is used.
- [ ] No upper-to-lower layered references were introduced.
- [ ] AC -> EX -> TC mapping is traceable.

## Checklist (planning complete)

- [ ] `plan.md` exists and is the runtime How SSOT.
- [ ] If `17_Plan.md` exists, it is synchronized with `plan.md`.
- [ ] Risks, gates, and verification approach are explicit.
