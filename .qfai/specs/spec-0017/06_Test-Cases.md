# 06 Test Cases

12 items.

| TC-ID        | Title                                        | Level       | EX-Ref                     | AC-Refs                    |
| ------------ | -------------------------------------------- | ----------- | -------------------------- | -------------------------- |
| TC-0017-0001 | New repo init creates both files             | integration | EX-0017-0001, EX-0017-0002 | AC-0017-0001, AC-0017-0002 |
| TC-0017-0002 | Skip when files exist                        | integration | EX-0017-0003, EX-0017-0004 | AC-0017-0003, AC-0017-0004 |
| TC-0017-0003 | --force does not override                    | integration | EX-0017-0005               | AC-0017-0005               |
| TC-0017-0004 | Directory auto-creation                      | integration | EX-0017-0006, EX-0017-0007 | AC-0017-0006, AC-0017-0007 |
| TC-0017-0005 | Partial existing files                       | integration | EX-0017-0008               | AC-0017-0008               |
| TC-0017-0006 | Report includes instructions                 | integration | EX-0017-0009, EX-0017-0010 | AC-0017-0009, AC-0017-0010 |
| TC-0017-0007 | --dry-run behavior                           | integration | EX-0017-0011               | AC-0017-0011               |
| TC-0017-0008 | Idempotency (3 consecutive runs)             | integration | EX-0017-0001, EX-0017-0003 | AC-0017-0001, AC-0017-0003 |
| TC-0017-0009 | SDD marker present in templates              | unit        | EX-0017-0001, EX-0017-0002 | AC-0017-0012               |
| TC-0017-0010 | Activation guidance message                  | integration | EX-0017-0009, EX-0017-0010 | AC-0017-0013               |
| TC-0017-0011 | Empty file treated as existing               | integration | EX-0017-0012               | AC-0017-0014               |
| TC-0017-0012 | Backward compatibility (existing tests pass) | integration | EX-0017-0012               | NFR-0002                   |
| TC-0017-0013 | Auto traceability row for EX-0017-0013       | integration | EX-0017-0013               |                            |
| TC-0017-0014 | Auto traceability row for EX-0017-0014       | integration | EX-0017-0014               |                            |

## TC-0017-0001: New repo init creates both files

**Level:** integration
**EX Refs:** EX-0017-0001, EX-0017-0002
**AC Refs:** AC-0017-0001, AC-0017-0002

Setup: Create a temporary empty directory.
Action: Run `qfai init` in the directory.
Verify:

- `.github/instructions/code-review.instructions.md` exists
- `.github/instructions/principles.instructions.md` exists
- Both files contain valid YAML frontmatter with `applyTo` and `excludeAgent`
- `code-review` contains severity prefix definitions
- `principles` contains SOLID/KISS/YAGNI/DRY

## TC-0017-0002: Skip when files exist

**Level:** integration
**EX Refs:** EX-0017-0003, EX-0017-0004
**AC Refs:** AC-0017-0003, AC-0017-0004

Setup: Create `.github/instructions/` with both files containing custom content.
Action: Run `qfai init`.
Verify:

- Both files retain their original custom content
- Report shows both as skipped

## TC-0017-0003: --force does not override

**Level:** integration
**EX Refs:** EX-0017-0005
**AC Refs:** AC-0017-0005

Setup: Create `.github/instructions/` with both files containing custom content.
Action: Run `qfai init --force`.
Verify:

- Both files retain their original custom content
- Report shows both as skipped (not created)

## TC-0017-0004: Directory auto-creation

**Level:** integration
**EX Refs:** EX-0017-0006, EX-0017-0007
**AC Refs:** AC-0017-0006, AC-0017-0007

Setup (case A): No `.github/` directory.
Setup (case B): `.github/` exists with other files, no `instructions/`.
Action: Run `qfai init`.
Verify:

- Case A: `.github/instructions/` created recursively, both files placed
- Case B: `instructions/` created, other `.github/` contents unaffected

## TC-0017-0005: Partial existing files

**Level:** integration
**EX Refs:** EX-0017-0008
**AC Refs:** AC-0017-0008

Setup: Create `.github/instructions/code-review.instructions.md` with custom content. Do not create `principles.instructions.md`.
Action: Run `qfai init`.
Verify:

- `code-review.instructions.md` retains custom content
- `principles.instructions.md` is created from template
- Report: created includes principles, skipped includes code-review

## TC-0017-0006: Report includes instructions

**Level:** integration
**EX Refs:** EX-0017-0009, EX-0017-0010
**AC Refs:** AC-0017-0009, AC-0017-0010

Setup (case A): New repo, no instructions.
Setup (case B): Both files exist.
Action: Run `qfai init`.
Verify:

- Case A: Created count includes 2 instructions files
- Case B: Skipped paths include both instructions file paths

## TC-0017-0007: --dry-run behavior

**Level:** integration
**EX Refs:** EX-0017-0011
**AC Refs:** AC-0017-0011

Setup: New repo, no instructions.
Action: Run `qfai init --dry-run`.
Verify:

- Report shows instructions files as planned for creation
- No instructions files exist on disk after execution

## TC-0017-0008: Idempotency (3 consecutive runs)

**Level:** integration
**EX Refs:** EX-0017-0001, EX-0017-0003
**AC Refs:** AC-0017-0001, AC-0017-0003

Setup: New repo, no instructions.
Action: Run `qfai init` three consecutive times.
Verify:

- Run 1: Both files created
- Run 2: Both files skipped, content identical to run 1
- Run 3: Both files skipped, content identical to run 1

## TC-0017-0009: SDD marker present in templates

**Level:** unit
**EX Refs:** EX-0017-0001, EX-0017-0002
**AC Refs:** AC-0017-0012

Setup: Resolve the init assets root via `getInitAssetsDir()`, then read template files from the `.github/instructions/` directory under that root.
Action: Parse file contents.
Verify:

- `code-review.instructions.md` contains `<!-- qfai:language-rules -->`
- `principles.instructions.md` contains `<!-- qfai:language-rules -->`
- Markers are positioned near the end of each file

## TC-0017-0010: Activation guidance message

**Level:** integration
**EX Refs:** EX-0017-0009, EX-0017-0010
**AC Refs:** AC-0017-0013

Setup (case A): New repo, no instructions.
Setup (case B): Both files exist.
Action: Run `qfai init` and capture stdout.
Verify:

- Case A: stdout contains activation guidance (mentions `@github-copilot review` or workflow)
- Case B: stdout does not contain activation guidance

## TC-0017-0011: Empty file treated as existing

**Level:** integration
**EX Refs:** EX-0017-0012
**AC Refs:** AC-0017-0014

Setup: Create `.github/instructions/code-review.instructions.md` as an empty file (0 bytes).
Action: Run `qfai init`.
Verify:

- The empty file is not overwritten
- Report shows the file as skipped

## TC-0017-0012: Backward compatibility (existing tests pass)

**Level:** integration
**EX Refs:** —
**AC Refs:** NFR-0002

Setup: Existing test suite.
Action: Run full test suite with the new instructions distribution code.
Verify:

- All existing tests pass without modification
- No regressions in root/ template copy, .qfai/ template copy, symlink creation, or copilot-instructions.md handling
