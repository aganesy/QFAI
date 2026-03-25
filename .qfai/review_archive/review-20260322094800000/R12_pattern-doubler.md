# R12: pattern-doubler

## Reviewer

- ID: pattern-doubler
- Name: Pattern Doubler

## Scope

spec-0017 SDD — ID-bearing item count and 2x target evaluation

## Current Counts

| Category  | Count  | IDs                               |
| --------- | ------ | --------------------------------- |
| US        | 4      | US-0017-0001 through US-0017-0004 |
| AC        | 14     | AC-0017-0001 through AC-0017-0014 |
| BR        | 10     | BR-0017-0001 through BR-0017-0010 |
| EX        | 12     | EX-0017-0001 through EX-0017-0012 |
| TC        | 12     | TC-0017-0001 through TC-0017-0012 |
| **Total** | **52** |                                   |

2x target: **104**

## Doubling Demand Assessment

### Coverage quality of existing items

The existing 52 items provide strong coverage of the core feature:

- **AC coverage**: All 4 US are covered by multiple ACs. AC-0017-0014 (0-byte edge case) shows good boundary thinking.
- **BR coverage**: Clean mapping from BRs to ACs. BR-0017-0002 (force-disabled) and BR-0017-0010 (0-byte) are important edge rules.
- **EX coverage**: 12 examples cover happy path (create), negative (skip), edge (partial, empty), and combined scenarios.
- **TC coverage**: 12 TCs provide integration-level coverage including idempotency (TC-0017-0008) and backward compatibility (TC-0017-0012).

### Missing perspectives for 2x target

To reach 104 items (+52), the following perspectives are underrepresented:

#### Additional AC candidates (+8)

1. **AC: Symlink-occupied path** — What happens if `.github/instructions/code-review.instructions.md` is a symlink to another file? Should `exists()` follow symlinks? (boundary)
2. **AC: Read-only destination directory** — What happens if `.github/instructions/` exists but is read-only? Error handling path. (error)
3. **AC: Template asset contains invalid YAML frontmatter** — Verify that malformed templates are caught or produce a clear error. (robustness)
4. **AC: Concurrent init execution** — Two `qfai init` processes targeting the same repo simultaneously. (race condition, acknowledged as out-of-scope in Plan but no AC)
5. **AC: Non-UTF-8 existing file** — Existing file has non-UTF-8 encoding. Does `exists()` still detect it? (encoding edge)
6. **AC: Destination path is a directory** — `.github/instructions/code-review.instructions.md` exists as a directory, not a file. (filesystem edge)
7. **AC: Long path (>260 chars on Windows)** — Path length exceeds OS limits when `.github/instructions/` is deep in the tree. (platform edge)
8. **AC: Template file has no trailing newline** — Verify the marker is positioned correctly regardless of trailing newline presence. (format edge)

#### Additional BR candidates (+4)

1. **BR: Symlink detection** — If destination path is a symlink, treat as existing (skip). Explicit rule for symlink interaction.
2. **BR: Error on write failure does not corrupt partial state** — If writing the second file fails, the first file should remain intact (no rollback needed).
3. **BR: Template encoding is UTF-8** — Explicit rule that templates are read and written as UTF-8.
4. **BR: Report ordering** — Instructions files appear after other init artifacts in the report (or at a defined position).

#### Additional EX candidates (+6)

1. **EX: Symlink exists at destination** — `.github/instructions/code-review.instructions.md` is a symlink. Expected: treated as existing, skipped.
2. **EX: Write permission denied** — `.github/instructions/` is read-only. Expected: error message, graceful handling.
3. **EX: Very long file path** — repo is in a deeply nested directory. Expected: works or fails with clear error.
4. **EX: Template marker position** — Verify marker is the last non-blank line in each template.
5. **EX: Mixed case filename** — `.github/instructions/Code-Review.instructions.md` exists (case mismatch). Expected: platform-dependent behavior.
6. **EX: Second run after manual edit** — User edits instructions file between runs. Expected: edited file preserved.

#### Additional TC candidates (+6)

1. **TC: Symlink at destination path** — Pre-create a symlink at the destination; run init; verify skip.
2. **TC: Write failure on second file** — Mock writeFile to fail on second file; verify first file intact and error reported.
3. **TC: Template marker position validation** — Assert marker is within the last 5 lines of each template file.
4. **TC: Manual edit preservation** — Create files via init, modify content, re-run init; verify modifications preserved.
5. **TC: Report message format** — Capture stdout and verify exact format of created/skipped report lines for instructions.
6. **TC: Case-sensitive path handling** — On case-insensitive filesystem, verify behavior when existing file has different case.

#### Additional US candidates (+2)

1. **US: Error recovery** — As a QFAI user, I want `qfai init` to handle write failures gracefully so that partial init state is clear.
2. **US: Template provenance** — As a QFAI user, I want to know which version of QFAI generated my instructions files so that I can determine if they are outdated.

### Summary

| Category  | Current | Proposed Additions | New Total |
| --------- | ------- | ------------------ | --------- |
| US        | 4       | +2                 | 6         |
| AC        | 14      | +8                 | 22        |
| BR        | 10      | +4                 | 14        |
| EX        | 12      | +6                 | 18        |
| TC        | 12      | +6                 | 18        |
| **Total** | **52**  | **+26**            | **78**    |

## Verdict

PASS

## Conclusion

The 2x target of 104 is **not fully reachable** with meaningful additions. The proposed +26 items bring the total to 78, which represents a 1.5x expansion. Beyond 78, additional items would be contrived or test implementation details rather than spec-level behavior. The feature's scope is inherently bounded: 2 static files, 1 function modification, create-only semantics. The current 52 items already provide excellent coverage density (13 items per user story).

The most valuable additions from the proposals above are:

1. **Symlink-at-destination** (AC + BR + EX + TC): A real edge case in QFAI's ecosystem where symlinks are used for skills.
2. **Write failure handling** (AC + BR + EX + TC): Error path coverage is absent from the current spec.
3. **Template marker position validation** (TC): Strengthens the forward-compatibility guarantee for SDD insertion.

Recommended priority additions: items related to symlink handling and error paths. The current 52 items are sufficient for PASS; the proposed additions are advisory for improved robustness.
