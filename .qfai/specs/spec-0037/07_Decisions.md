# 07 Decisions

## Decisions

3 items referenced from \_policies/08_Decisions.md

| DEC-ID      | Title                                              | Adopted Option                                                                 | Source                    | Rationale                                                                                                                                |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| SD-0037-001 | 3-layer migration with warning window              | 3-version migration path (old/intermediate/final) with v1.7.8 warning severity | DR-0059, DR-0080, DR-0083 | Migration guidance only in v1.7.8 (DR-0059); 3-layer model is canonical (DR-0080); versioning strategy spans v1.7.6a-v1.7.8 (DR-0083)    |
| SD-0037-002 | Anti-preference scope limited to taste/axes/review | Traceability limited to taste -> axes -> review (3 points)                     | AD-007 (OQ-0007)          | Full flow traceability is scope-excessive for v1.7.8; 3-point coverage addresses the highest-value checkpoints per discussion resolution |
| SD-0037-003 | Convergence doc as new steering document           | New steering document (not extension of existing product.md)                   | AD-008 (OQ-0008)          | Independent document provides clearer canonical baseline than extending existing files; referenced from product/manifest/spec index      |

## Rejected Options

| DEC-ID      | Rejected Option                                     | Reason                                                                             |
| ----------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SD-0037-001 | Immediate error severity for stale packs in v1.7.8  | Breaking change for existing adopters; migration window needed (NFR-0001)          |
| SD-0037-001 | No migration detection (silent pass)                | Stale packs would accumulate undetected; contradicts NFR-0005 SSOT convergence     |
| SD-0037-002 | Full anti-preference traceability across all flows  | Scope excessive for v1.7.8; taste/axes/review covers highest-value points (RJ-004) |
| SD-0037-003 | Extend existing product.md with convergence section | Mixes concerns; product.md has different update cadence and audience               |
| SD-0037-003 | Add convergence to specs/\_policies                 | \_policies is read-only escalation context, not a living convergence tracker       |
