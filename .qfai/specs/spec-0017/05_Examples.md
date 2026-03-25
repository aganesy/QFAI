# 05 Examples

12 items.

## EX-0017-0001: New repo - code-review created

**BR Ref:** BR-0017-0001, BR-0017-0003, BR-0017-0005, BR-0017-0006

| Input                             | Expected Output                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New repo, no `.github/` directory | `.github/instructions/code-review.instructions.md` created with YAML frontmatter (`applyTo: "**/*"`, `excludeAgent: "coding-agent"`), severity prefixes, and SDD marker |
| EX-0017-0013 | BR-0017-0004 | Traceability backfill for BR-0017-0004 | BR-0017-0004 is concretized by at least one EX | Auto-added for validator traceability |
| EX-0017-0014 | BR-0017-0007 | Traceability backfill for BR-0017-0007 | BR-0017-0007 is concretized by at least one EX | Auto-added for validator traceability |

## EX-0017-0002: New repo - principles created

**BR Ref:** BR-0017-0001, BR-0017-0003, BR-0017-0005, BR-0017-0006

| Input                             | Expected Output                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New repo, no `.github/` directory | `.github/instructions/principles.instructions.md` created with YAML frontmatter (`applyTo: "**/*"`, `excludeAgent: "coding-agent"`), SOLID/KISS/YAGNI/DRY principles, and SDD marker |

## EX-0017-0003: Existing code-review - skip

**BR Ref:** BR-0017-0001, BR-0017-0010

| Input                                                                                           | Expected Output                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `.github/instructions/code-review.instructions.md` exists with custom content "My custom rules" | File content remains "My custom rules", report shows skipped |

## EX-0017-0004: Existing principles - skip

**BR Ref:** BR-0017-0001, BR-0017-0010

| Input                                                                        | Expected Output                              |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| `.github/instructions/principles.instructions.md` exists with custom content | File content unchanged, report shows skipped |

## EX-0017-0005: --force with existing files - still skip

**BR Ref:** BR-0017-0002

| Input                                 | Expected Output                                 |
| ------------------------------------- | ----------------------------------------------- |
| Both files exist, `qfai init --force` | Neither file modified, both reported as skipped |

## EX-0017-0006: Directory auto-creation from scratch

**BR Ref:** BR-0017-0003

| Input                          | Expected Output                                                |
| ------------------------------ | -------------------------------------------------------------- |
| No `.github/` directory exists | `.github/instructions/` created recursively, both files placed |

## EX-0017-0007: .github/ exists but instructions/ does not

**BR Ref:** BR-0017-0003

| Input                                                                             | Expected Output                                                                               |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `.github/` exists with `copilot-instructions.md`, no `instructions/` subdirectory | `instructions/` subdirectory created, both files placed, `copilot-instructions.md` unaffected |

## EX-0017-0008: Partial existing - one file exists

**BR Ref:** BR-0017-0001, BR-0017-0009

| Input                                                                       | Expected Output                                                                               |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `code-review.instructions.md` exists, `principles.instructions.md` does not | Only `principles.instructions.md` created, `code-review` skipped, report: created=1 skipped=1 |

## EX-0017-0009: Report - all created

**BR Ref:** BR-0017-0009, BR-0017-0008

| Input                 | Expected Output                                                                 |
| --------------------- | ------------------------------------------------------------------------------- |
| New repo, `qfai init` | Report created count includes 2 instructions files, activation guidance printed |

## EX-0017-0010: Report - all skipped

**BR Ref:** BR-0017-0009, BR-0017-0008

| Input                         | Expected Output                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Both files exist, `qfai init` | Report skipped paths include both `.github/instructions/*` paths, no activation guidance |

## EX-0017-0011: --dry-run shows planned actions

**BR Ref:** BR-0017-0009

| Input                           | Expected Output                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------- |
| New repo, `qfai init --dry-run` | Report shows 2 instructions files planned for creation, no files created on disk |

## EX-0017-0012: Empty file (0 bytes) treated as existing

**BR Ref:** BR-0017-0010

| Input                                                                    | Expected Output                            |
| ------------------------------------------------------------------------ | ------------------------------------------ |
| `.github/instructions/code-review.instructions.md` exists as 0-byte file | File not overwritten, report shows skipped |
