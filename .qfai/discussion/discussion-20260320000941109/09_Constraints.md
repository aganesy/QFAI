# Constraints

## Technical Constraints

| ID        | Constraint                                                                             | Rationale                                                            |
| --------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CON-T-001 | TypeScript/Node.js codebase — all changes must be in TypeScript                        | Project standard; no polyglot introduction allowed                   |
| CON-T-002 | pnpm workspace — must use pnpm for package management                                 | Existing lockfile and CI configuration depend on pnpm                |
| CON-T-003 | Vitest test framework — assets and init tests use Vitest                               | Test infrastructure is already established on Vitest                 |
| CON-T-004 | Single package (packages/qfai) — all changes confined to one package                   | Monorepo structure; v1.6.2 scope does not justify new packages       |

## Operational Constraints

| ID        | Constraint                                                                             | Rationale                                                            |
| --------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CON-O-001 | CI must pass on PR — GitHub Actions workflow must be green before merge                | Quality gate; no broken-CI merges allowed                            |
| CON-O-002 | verify-pack.mjs must pass — packaging integrity check validates all bundled artifacts  | Prevents shipping incomplete or inconsistent packages                |

## Deadline / Scope Constraints

| ID        | Constraint                                                                             | Rationale                                                            |
| --------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CON-D-001 | v1.6.2 scope only — no v1.6.3+ items allowed in this release                          | Scope discipline; future items must wait for their designated release |
