# Implementation Plan — CAP-0017: Copilot レビューインストラクション配布

spec: SPEC-0017
phase: draft
last-updated: 2026-03-22

---

## 1. Implementation Strategy

### Step 1: Create template assets

Location: `packages/qfai/assets/init/.github/instructions/`

Create two template files:

#### 1a. `code-review.instructions.md`

- Base: existing `.github/instructions/code-review.instructions.md` (repository root)
- Generalize by removing the "TypeScript specific checks" section (lines 53-59 in current file) — the template must be language-agnostic so adopters in non-TypeScript repos are not confused by irrelevant rules.
- Retain all other sections (frontmatter, Language, Process, Comment format, Review checklist, Specific checks, Library/CLI compatibility checks, Constraints).
- Append `<!-- qfai:language-rules -->` marker as the last line before the final newline. This marker is the SDD insertion point for future language-specific rule injection (deferred to a separate spec).

#### 1b. `principles.instructions.md`

- Base: existing `.github/instructions/principles.instructions.md` (repository root)
- Already language-agnostic — copy nearly as-is.
- Append `<!-- qfai:language-rules -->` marker as the last line before the final newline.

Both files retain the YAML frontmatter (`applyTo`, `excludeAgent`) from their source.

### Step 2: Add instructions distribution logic to `syncIntegrationWrappers`

File: `packages/qfai/src/cli/commands/init.ts`

Insert a new **Step 3.5** between the existing Step 3 (copilot-instructions.md, lines 269-280) and Step 4 (skill symlinks, lines 282-285).

Implementation pattern (mirrors the copilot-instructions.md pattern at lines 270-280):

```typescript
const INSTRUCTIONS_FILES = ["code-review.instructions.md", "principles.instructions.md"];

for (const fileName of INSTRUCTIONS_FILES) {
  const dest = path.join(destRoot, ".github", "instructions", fileName);
  const alreadyExists = await exists(dest);
  if (alreadyExists) {
    // Always skip — --force is disabled for instructions files
    skipped.push(dest);
  } else {
    copied.push(dest);
    if (!options.dryRun) {
      await mkdir(path.dirname(dest), { recursive: true });
      const templateSrc = path.join(getInitAssetsDir(), ".github", "instructions", fileName);
      const content = await readFile(templateSrc, "utf-8");
      await writeFile(dest, content, "utf-8");
    }
  }
}
```

Key design decisions:

- **Force-disabled**: The `if (alreadyExists)` branch always skips, regardless of `options.force`. This differs from copilot-instructions.md (which respects `--force`). Rationale: instructions files are team-customized review policies; `--force` must not silently overwrite them.
- **Template read via `readFile`**: Unlike copilot-instructions.md (built inline via `buildCopilotInstructions()`), instructions files are read from the asset directory. This keeps large review-policy content out of TypeScript source and makes future edits simpler.
- **`mkdir` with `{ recursive: true }`**: Auto-creates `.github/instructions/` if it does not exist.
- **Import addition**: Add `readFile` to the `node:fs/promises` import at line 3.

The `getInitAssetsDir()` function (in `packages/qfai/src/shared/assets.ts`) resolves to `packages/qfai/assets/init/` — the new `.github/instructions/` subdirectory is discovered automatically since it is under that tree.

### Step 3: Add activation guidance to `runInit` output

File: `packages/qfai/src/cli/commands/init.ts`

After `syncIntegrationWrappers` returns (line 63) and before the `report()` call (line 70):

1. Inspect `wrappersResult.copied` for instructions file entries. Use `path.basename()` to match filenames (avoids Windows backslash issues with string matching).
2. Skip guidance if `options.dryRun` is true (dry-run should not suggest activation).
3. If any instructions files were newly created (and not dry-run), call `info()` with activation guidance:

```typescript
const instructionsCreated = wrappersResult.copied.some(
  (p) => path.basename(p).endsWith(".instructions.md") && p.includes("instructions"),
);
if (instructionsCreated && !options.dryRun) {
  info("");
  info("Copilot code review instructions were created.");
  info("To activate: use '@github-copilot review' in PR comments,");
  info("or set up a GitHub Actions workflow for automated reviews.");
  info("See: https://docs.github.com/en/copilot/using-github-copilot/code-review");
}
```

This message prints only on the first non-dry-run when files are created, not on subsequent idempotent runs (when files are skipped) or dry-run invocations.

### Step 4: Verify package build includes new assets

File: `packages/qfai/package.json`

The `"files"` array already includes `"assets"` (line 28). Since the new templates live under `packages/qfai/assets/init/.github/instructions/`, they are automatically included in `npm pack`. No package.json change is required.

Verification: Add a test (TC-0017-0009) that reads the template files from `getInitAssetsDir()` and asserts the `<!-- qfai:language-rules -->` marker is present. This implicitly verifies the assets are resolvable at test time and would catch a missing-asset regression in CI.

---

## 2. Test Strategy

### Test location

Extend the existing suite: `packages/qfai/tests/cli/init.test.ts`

All new tests go inside the existing `describe("copyTemplateTree", ...)` block, following the same patterns (mkdtemp, runInit, access/readFile assertions, finally rm).

### Test cases

| TC ID        | Description                                              | Key assertions                                                                                                                                        |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-0017-0001 | New repo creates both instructions files                 | `access()` succeeds for both `.github/instructions/code-review.instructions.md` and `principles.instructions.md` after `runInit`                      |
| TC-0017-0002 | Skip when both files exist                               | Pre-create both files with custom content; run `runInit`; assert custom content is preserved                                                          |
| TC-0017-0003 | `--force` does not override instructions                 | Pre-create both files; run `runInit({ force: true })`; assert custom content is preserved (force-disabled)                                            |
| TC-0017-0004 | Directory auto-creation                                  | Run `runInit` on empty temp dir; assert `.github/instructions/` directory was created                                                                 |
| TC-0017-0005 | Partial existing files                                   | Pre-create only `code-review.instructions.md`; run `runInit`; assert code-review is preserved, principles is created                                  |
| TC-0017-0006 | Report includes instructions in counts                   | Capture stdout; assert `created:` count includes the instructions files                                                                               |
| TC-0017-0007 | `--dry-run` does not write files                         | Run `runInit({ dryRun: true })`; assert `.github/instructions/` does not exist on disk                                                                |
| TC-0017-0008 | Idempotency (3 consecutive runs)                         | Run `runInit` 3 times; assert both files exist and content matches template after each run                                                            |
| TC-0017-0009 | SDD marker present in templates                          | Read templates from `getInitAssetsDir()`; assert both contain `<!-- qfai:language-rules -->`                                                          |
| TC-0017-0010 | Activation guidance printed on create                    | Capture stdout on first run; assert guidance message appears. Run again; assert guidance does not appear                                              |
| TC-0017-0011 | Empty file treated as existing (skip)                    | Pre-create an empty (0-byte) instructions file; run `runInit`; assert file remains empty (not overwritten)                                            |
| TC-0017-0012 | Backward compatibility — existing init outputs unchanged | Run `runInit`; assert all previously expected files (from the existing `expectedRegularFiles` list) still exist; instructions files are additive only |

### ATDD annotations

Each test includes a comment annotation for traceability:

- Format: `// QFAI:SPEC-0017:TC-XXXX`
- E2E obligation: `// QFAI:SPEC-0017:US-XXXX` in `tests/e2e/` (to be added when E2E suite exists for init)

### Test helpers

- Reuse existing `captureStdout` from `tests/helpers/stdout.ts` for TC-0017-0006, TC-0017-0007, TC-0017-0010.
- Reuse existing `expectSymlink`, `expectSymlinkTarget` helpers if needed.
- No mock database or API — all tests are filesystem-only with `mkdtemp`.

### E2E obligations (deferred)

US-0017-0001 through US-0017-0004 require `QFAI:SPEC-0017:US-XXXX` annotations in `tests/e2e/`. Since the E2E test infrastructure for CLI init does not yet exist, E2E annotations will be added when that infrastructure is built. The L3 integration tests above provide full functional coverage in the interim.

---

## 3. Risk & Mitigation

| Risk                                    | Impact                                                             | Likelihood | Mitigation                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template asset not included in npm pack | `runInit` throws "Template assets not found" for published package | Low        | TC-0017-0009 reads templates via `getInitAssetsDir()` — catches missing assets in CI. The `"files": ["assets"]` entry in package.json already covers the path. |
| Breaking existing init behavior         | Regression in existing file creation/symlinks                      | Medium     | TC-0017-0012 explicitly verifies backward compatibility. Existing test suite (17 tests) runs as a gate before merge.                                           |
| Path separator issues (Windows)         | File creation fails or path comparisons break on Windows           | Low        | Use `path.join()` consistently (matches existing codebase pattern). CI runs on Windows.                                                                        |
| `readFile` import missing               | Compile error                                                      | Low        | TypeScript compiler catches this immediately.                                                                                                                  |
| Race condition in parallel init         | Two `qfai init` processes write simultaneously                     | Very Low   | Out of scope — same limitation as existing init. The `exists` + `writeFile` pattern is not atomic, but init is a developer-invoked one-shot command.           |

---

## 4. Dependencies

### Upstream

- **discussion-20260322091309602** — Approved. Provides the requirements (REQ-0001 through REQ-0008, NFR-0001 through NFR-0004) and design decisions (DR-0022, DR-0023) that this plan implements.

### Downstream

- **Language-specific rules insertion** — Deferred to a separate spec.
  The `<!-- qfai:language-rules -->` marker placed by this implementation is the integration point.
  A future `/qfai-sdd` enhancement will parse this marker and inject language-specific review rules.

### Internal (no action required)

- `packages/qfai/package.json` `"files"` field already includes `"assets"` — no change needed.
- `getInitAssetsDir()` in `packages/qfai/src/shared/assets.ts` resolves the asset path — no change needed.
