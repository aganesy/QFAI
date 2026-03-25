# Review: Code Reviewer

## Reviewer

- ID: code-reviewer
- Name: Code Reviewer

## Scope

discussion-20260322091309602

## Checks

1. **init.ts modification approach (syncIntegrationWrappers vs separate function)**: OQ-0001 resolved to place instructions logic inside `syncIntegrationWrappers`. Verified that the current `init.ts` (line 236+) already handles `.github/copilot-instructions.md` generation within this function. Adding `.github/instructions/` file placement here follows the existing pattern and avoids scattering `.github/` generation logic across multiple functions. The rejected option (B) of a standalone `syncInstructionsFiles` would have created a second code path for `.github/` operations, increasing maintenance burden. Decision is sound.

2. **Template asset strategy (file vs hardcode)**: OQ-0002 resolved to use asset files at `assets/init/.github/instructions/`. The rationale (70-110 line templates are too long to hardcode) is valid -- `buildCopilotInstructions()` hardcodes ~17 lines, which is manageable, but instructions files would be 4-6x longer. Asset files allow editing with syntax highlighting and linting. This also aligns with CON-T02 (existing asset management pattern). No maintainability concern.

3. **create-only protection implementation risk**: REQ-0003 requires skip even when `--force` is set. This is a divergence from the existing `copyTemplateTree` behavior where `--force` enables overwrite. Implementation must explicitly check for file existence and bypass the force flag for `.github/instructions/` paths. Risk is low if implemented as a simple `fs.existsSync()` guard before write, but the spec should ensure downstream developers understand this is intentional (not a bug). CON-O01 and US-03 Seed #5 both document this clearly. Acceptable.

4. **Directory creation safety**: REQ-0006 requires recursive `mkdir` for `.github/instructions/`. CON-T03 specifies `{ recursive: true }`. This is the standard Node.js `fs.mkdir` pattern and is safe -- it no-ops if the directory already exists. No risk of overwriting `.github/` contents. Verified against NFR-0002 (backward compatibility).

5. **Report integration feasibility**: REQ-0005 requires created/skipped counts to include instructions files. The existing init report mechanism already tracks created and skipped paths. Adding 2 more paths (instructions files) is trivial and carries no architectural risk. The spec does not prescribe a new report category, meaning instructions files will appear alongside other init assets in the same created/skipped lists. This is the simplest correct approach.

6. **npm pack inclusion**: REQ-0004 acceptance criteria and 10_Policy both require that asset files are included in `npm pack` output. This is an implementation-time verification item. The spec correctly flags it but does not over-specify the mechanism (e.g., package.json `files` field vs `.npmignore`). Downstream developers have sufficient guidance.

7. **SDD extension point design**: OQ-0003 defers language-specific rule injection to a separate spec. From a code perspective, this means the instructions files placed by `qfai init` must be designed as stable base files that `/qfai-sdd` can later append to. The spec does not prescribe a marker or insertion point within the template files. This is acceptable for the discussion phase -- the SDD spec will need to define the append mechanism. No blocking risk for this spec.

8. **Test strategy adequacy**: 05_Scope success criteria list 5 verifiable conditions. 03_Story-Workshop Example Seeds provide 20+ test scenarios across 4 user stories and 6 perspectives. The idempotency scenario (3 consecutive runs), partial-existing scenario (one file present, one absent), and 0-byte file edge case are particularly valuable. Test coverage design is sufficient to catch regressions.

9. **Symlink vs regular file decision**: CON-T04 specifies instructions files are regular files (not symlinks). This is correct -- unlike agent integration wrappers that point to shared templates, instructions files are meant to be user-editable and project-specific. Symlinks would break if the QFAI package is removed or updated. No risk.

10. **Performance impact**: NFR-0004 sets a < 100ms overhead threshold. The implementation adds at most 2 `existsSync` checks + 2 file copies (or 0 copies if skipped). This is well within the threshold on any modern file system. No concern.

## Verdict

PASS

## Notes

- The design intent is clear and actionable for downstream coding. A developer reading this spec can implement the feature without ambiguity.
- The key implementation decision (syncIntegrationWrappers, not a separate function) is well-justified and traceable to the existing codebase pattern at `init.ts:236`.
- The only area requiring attention during SDD/implementation is the force-flag bypass: the developer must ensure the `--force` code path explicitly excludes `.github/instructions/` files, not just rely on the default `copyTemplateTree` behavior.
- Template asset content (the actual instructions Markdown) is out of scope for this discussion pack and will be authored during implementation. The spec correctly constrains it to be language-agnostic (CON-O02) with valid frontmatter (NFR-0003).
