# 12 OQ Resolution Log

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                                                                                                    | Evidence               |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 2026-09-23 | OQ-0001 | created  | Put to the user as Q1 in the grilling session                                                                                              | SRC-0113 Q1            |
| 2026-09-23 | OQ-0001 | resolved | Concrete layer named `02_business-flow`                                                                                                    | SRC-0113 Q1            |
| 2026-09-23 | OQ-0002 | created  | Put to the user as Q2 in the grilling session                                                                                              | SRC-0113 Q2            |
| 2026-09-23 | OQ-0002 | resolved | IDs four digits, unique across the project: `BF-0001`, `US-0001-0001`, `AC-0001-0001-01`, `EX-0001-0001-01`                                | SRC-0113 Q2            |
| 2026-09-23 | OQ-0003 | created  | Put to the user as Q3 in the grilling session                                                                                              | SRC-0113 Q3            |
| 2026-09-23 | OQ-0003 | resolved | Business rules live in the contract that enforces them; every BR cites at least one EX and every EX is cited by at least one BR            | SRC-0113 Q3            |
| 2026-09-23 | OQ-0004 | created  | Put to the user as Q4 in the grilling session                                                                                              | SRC-0113 Q4            |
| 2026-09-23 | OQ-0004 | resolved | E2E tests verify a BF, integration and API tests an AC (as corrected at Q16), every other test an EX                                       | SRC-0113 Q4            |
| 2026-09-23 | OQ-0005 | created  | Put to the user as Q5 in the grilling session                                                                                              | SRC-0113 Q5            |
| 2026-09-23 | OQ-0005 | resolved | Test list, plan and traceability ledger abolished                                                                                          | SRC-0113 Q5            |
| 2026-09-23 | OQ-0006 | created  | Put to the user as Q6 in the grilling session                                                                                              | SRC-0113 Q6            |
| 2026-09-23 | OQ-0006 | resolved | Two tables of four columns; TODO / WIP / DONE, plus SUPERSEDED and REJECTED for decisions and DEFERRED for questions; no date, no approver | SRC-0113 Q6            |
| 2026-09-23 | OQ-0007 | created  | Put to the user as Q7 in the grilling session                                                                                              | SRC-0113 Q7            |
| 2026-09-23 | OQ-0007 | resolved | Triage records and change requests become `decisions.md` rows; `.qfai/decisions/` abolished                                                | SRC-0113 Q7            |
| 2026-09-23 | OQ-0008 | created  | Put to the user as Q8 in the grilling session                                                                                              | SRC-0113 Q8            |
| 2026-09-23 | OQ-0008 | resolved | `manifest.md` and `product.md` into `01_policy`; `tech.md` and `structure.md` into `03_contract`; merged without duplicates                | SRC-0113 Q8            |
| 2026-09-23 | OQ-0009 | created  | Put to the user as Q9 in the grilling session                                                                                              | SRC-0113 Q9            |
| 2026-09-23 | OQ-0009 | resolved | Manifest YAML and `quality.md` merged into `qfai.config.yaml`                                                                              | SRC-0113 Q9            |
| 2026-09-23 | OQ-0010 | created  | Put to the user as Q10 in the grilling session                                                                                             | SRC-0113 Q10           |
| 2026-09-23 | OQ-0010 | resolved | Shared rules into `.qfai/assistant/rule/`; skill-scoped files into their skill; `process/` abolished                                       | SRC-0113 Q10           |
| 2026-09-23 | OQ-0011 | created  | Put to the user as Q11 in the grilling session                                                                                             | SRC-0113 Q11           |
| 2026-09-23 | OQ-0011 | resolved | QFAI-owned directories singular; skill-internal convention names kept                                                                      | SRC-0113 Q11           |
| 2026-09-23 | OQ-0012 | created  | Put to the user as Q12 in the grilling session                                                                                             | SRC-0113 Q12           |
| 2026-09-23 | OQ-0012 | resolved | A `/qfai-migration-spec-to-story` skill carries adopters across                                                                            | SRC-0113 Q12           |
| 2026-09-23 | OQ-0013 | created  | Put to the user as Q13 in the grilling session                                                                                             | SRC-0113 Q13           |
| 2026-09-23 | OQ-0013 | resolved | Tests required at all three layers; an exception is a `decisions.md` row                                                                   | SRC-0113 Q13           |
| 2026-09-23 | OQ-0014 | created  | Put to the user as Q14 in the grilling session                                                                                             | SRC-0113 Q14           |
| 2026-09-23 | OQ-0014 | resolved | Each EX cites exactly one AC                                                                                                               | SRC-0113 Q14           |
| 2026-09-23 | OQ-0015 | created  | Put to the user as Q15 in the grilling session                                                                                             | SRC-0113 Q15           |
| 2026-09-23 | OQ-0015 | resolved | Contract-ID test annotations abolished                                                                                                     | SRC-0113 Q15           |
| 2026-09-23 | OQ-0016 | created  | Put to the user as Q16 in the grilling session                                                                                             | SRC-0113 Q16           |
| 2026-09-23 | OQ-0016 | resolved | Next test derived from EX IDs with no test; `qfai-atdd` covers BF and AC, `qfai-implement` covers EX                                       | SRC-0113 Q16           |
| 2026-09-23 | OQ-0017 | created  | Put to the user as Q17 in the grilling session                                                                                             | SRC-0113 Q17           |
| 2026-09-23 | OQ-0017 | resolved | A BR is written inside the contract file, in the form that file type allows                                                                | SRC-0113 Q17           |
| 2026-09-23 | OQ-0018 | created  | Put to the user as Q18 in the grilling session                                                                                             | SRC-0113 Q18           |
| 2026-09-23 | OQ-0018 | resolved | Only what a project changes merges into `qfai.config.yaml`; card frontmatter is the single agent definition                                | SRC-0113 Q18           |
| 2026-09-23 | OQ-0019 | created  | Put to the user as Q19 in the grilling session                                                                                             | SRC-0113 Q19           |
| 2026-09-23 | OQ-0019 | resolved | Mechanical migration steps are scripts bundled with the migration skill                                                                    | SRC-0113 Q19           |
| 2026-09-23 | OQ-0020 | created  | Put to the user as Q20 in the grilling session                                                                                             | SRC-0113 Q20           |
| 2026-09-23 | OQ-0020 | resolved | Relocation table accepted as proposed                                                                                                      | SRC-0113 Q20           |
| 2026-09-23 | OQ-0021 | created  | This repository's own migration, excluded from the discussion by the user                                                                  | SRC-0106; SRC-0113     |
| 2026-09-23 | OQ-0021 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0106; SRC-0113     |
| 2026-09-23 | OQ-0022 | created  | Release version and pinned branch, a user decision                                                                                         | SRC-0117               |
| 2026-09-23 | OQ-0022 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0117               |
| 2026-09-23 | OQ-0023 | created  | Renumbering cost when flows split or reorder                                                                                               | SRC-0002               |
| 2026-09-23 | OQ-0023 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0002               |
| 2026-09-23 | OQ-0024 | created  | ID allocation across parallel branches                                                                                                     | SRC-0002; SRC-0003     |
| 2026-09-23 | OQ-0024 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0002; SRC-0003     |
| 2026-09-23 | OQ-0025 | created  | Growth of `decisions.md`                                                                                                                   | SRC-0014               |
| 2026-09-23 | OQ-0025 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0014               |
| 2026-09-23 | OQ-0026 | created  | Guard that `decisions.md` rows are only appended                                                                                           | SRC-0014; SRC-0116     |
| 2026-09-23 | OQ-0026 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0014; SRC-0116     |
| 2026-09-23 | OQ-0027 | created  | Exact per-format schema of business rules in contracts                                                                                     | SRC-0113 Q17           |
| 2026-09-23 | OQ-0027 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0113 Q17           |
| 2026-09-23 | OQ-0028 | created  | Final placement of multi-skill assistant files                                                                                             | SRC-0113 Q10; SRC-0121 |
| 2026-09-23 | OQ-0028 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0113 Q10; SRC-0121 |
| 2026-09-23 | OQ-0029 | created  | Exception link and holding statuses, raised in review cycle 1                                                                              | SRC-0113 Q13           |
| 2026-09-23 | OQ-0029 | deferred | Deferred with full metadata in 13_Deferred.md                                                                                              | SRC-0113 Q13           |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
