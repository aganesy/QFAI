# specs (Spec Pack 01..18)

## Purpose

Spec Pack is the validation unit for one feature slice.
`qfai validate` assumes `.qfai/specs/spec-XXXX/01..18` as the required file set.

## Required file set (hard gate)

```text
spec-XXXX/
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

## SSOT

- Traceability SSOT: `16_Traceability-ledger.md`
- How SSOT: `17_Plan.md`
- Contracts SSOT: `.qfai/contracts/**`
- Examples SSOT: `09_Examples.feature`
- Test cases SSOT: `10_Test-cases.md`

## Reference direction rule

- Upper-to-lower references are forbidden.
- Lower-to-upper references are allowed.
- Cross-layer links are written in `16_Traceability-ledger.md`.

## Notes

- `11_Contracts.md` is an index document and not a behavior SSOT.
- Report artifacts (`.qfai/report/**`) are derived outputs and non-SSOT.
- Release gate is enabled when `03_Initiative.md` contains `release_candidate: true`.
- `15_Open-questions.md` should manage each item with `status: open | resolved | deferred`.
- `18_delta.md` must include required sections (`Change Summary`, `Rationale`, `Candidates Considered`, `Adopted`, `Rejected`, `Impact`, `Follow-ups`), and `Rejected` must include both `DO NOT` and `Temptation`.
