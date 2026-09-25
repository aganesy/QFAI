# 09 Constraints

## Technical Constraints

> IDs use the `DTC-` prefix. Bare `TC-NNNN` is the spec-layer Test Case ID and must not
> be used for a technical constraint.

| ID    | Constraint                                                                                                                                                                                                                                         | Rationale                                                                   | Impact                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DTC-1 | No internal ID or private version marker (`spec-0010` and above, `CAP-0010` and above, `DEC-NNNN-NNNN`, `DR-`, `OQ-NNNN-NNNN`, `CHG-`, `vN.M`, `schemaVersion`) in any shipped file (SRC-0114); REQ-0024 adds the new ID shapes before the cutover | Shipped files reach adopters, for whom these IDs point at nothing           | New templates, skills, the migration skill and its scripts must use sample IDs from the sample band and describe versions by the released version only |
| DTC-2 | Document structure is declared in `packages/qfai/assets/mdschema/**` and enforced by `pnpm lint:mdschema` and `pnpm lint:mermaid` (SRC-0115)                                                                                                       | One reviewable description of each document shape                           | Every new file needs a schema and a manifest entry; every removed file loses both                                                                      |
| DTC-3 | Schemas and templates are held together in both directions by `mdschemaSchemas.test.ts` (SRC-0120)                                                                                                                                                 | A schema with no template, or a template the schema rejects, fails the test | Schemas and templates change in the same commit (phase P2)                                                                                             |
| DTC-4 | `.qfai/assistant/` is generated from `packages/qfai/assets/init/.qfai/` by `pnpm sync:ssot`; `ci:gate:ssot` fails on drift (SRC-0107)                                                                                                              | An edit made directly in the mirror is reverted and fails CI                | Every assistant-tree change is made in the package and synced in the same commit                                                                       |
| DTC-5 | Host-defined directory names stay as the host defines them (`SKILL_INTEGRATION_DIRS`, SRC-0103)                                                                                                                                                    | Hosts find skills and agents only at their own paths                        | The singular-name rule (REQ-0018) stops at the host boundary                                                                                           |
| DTC-6 | Tracked text is English (SRC-0118)                                                                                                                                                                                                                 | One search finds the whole chain                                            | Templates, skills, finding messages and the migration report are written in English                                                                    |
| DTC-7 | TypeScript rules in `CLAUDE.md#Project Rules`: no bare `as`, every promise awaited or returned, functions near 50 lines                                                                                                                            | Repository convention                                                       | Applies to the new validators and the migration scripts                                                                                                |

## Operational Constraints

| ID   | Constraint                                                                                                                                               | Rationale                                        | Impact                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| OC-1 | This repository's CI validates its own `.qfai/specs/` in three self-validate steps (SRC-0106)                                                            | The repository is governed by what it ships      | Making the old layout an error and migrating this repository land in one change (P7, OQ-0021) |
| OC-2 | A change to this repository's CI carries a `SHIPPED-CI:` disposition and reason, or changes the shipped workflow templates in the same change (SRC-0116) | Adopter CI and this CI drift apart otherwise     | Any CI step renamed for the new layout records whether the shipped templates take it          |
| OC-3 | The release version and the pinned branch are the user's decision (SRC-0117)                                                                             | A branch pin is the user's release authorization | No version edit or release commit until the user names the version (OQ-0022)                  |
| OC-4 | No new file or directory at the repository root without the user's approval (SRC-0119)                                                                   | Root additions policy                            | The migration skill, its scripts and fixtures live inside `packages/qfai/`                    |
| OC-5 | Scratch files go under `tmp/` (`CLAUDE.md#Project Rules`)                                                                                                | Repository rule                                  | Migration dry-run output written by agents in this repository goes under `tmp/`               |

## Legal / Compliance Constraints

| ID   | Constraint                             | Regulation / Standard                | Impact                                                   |
| ---- | -------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| LC-1 | The package keeps its existing license | `packages/qfai/package.json#license` | No new third-party dependency is required by the request |

## Budget Constraints

- Budget range: no external spend. The work is done in this repository with its existing tooling.
- Cost drivers: the number of validators and skills that read the old layout (SRC-0101), and the migration of this repository's 18 spec pack directories (`.qfai/specs/spec-0001` to `spec-0017` and `spec-XXXX`, listed on 2026-09-23).

## Timeline Constraints

- Hard deadlines: none set.
- Milestones: phases P0 to P8 (02_Inception-Deck.md#8. Size It Up (Effort & Timeline)). The version and branch decision (OQ-0022) must be taken before P1, the first phase that changes shipped files. P1 to P7 land on the pinned integration branch, and no release carries P2 to P6 output before the P7 cutover.
