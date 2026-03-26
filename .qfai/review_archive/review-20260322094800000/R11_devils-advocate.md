# R11: devils-advocate

## Reviewer

- ID: devils-advocate
- Name: Devil's Advocate

## Scope

spec-0017 SDD (10 files): 01_Spec through 10_Plan

## Challenges

### Challenge 1: The upgrade-path gap from the discussion review is only partially addressed

- Attack: The discussion-phase R11 review (Challenge 1) identified that create-only with force-disabled creates an update dead-end. The SDD's 09_delta.md lists "instructions upgrade path" as deferred to v1.7.0 with mitigation "manual delete + re-init." However, the spec itself (01_Spec) does not reference this deferred item. OQ-0006 is listed in 09_delta.md but not in 08_Open-questions.md (which shows "0 items -- 0 open questions"). The SDD claims zero open questions while simultaneously deferring a known gap. This is technically correct (OQ-0006 is resolved-as-deferred, not open) but creates a traceability gap: a reader of 08_Open-questions.md gets no signal that a significant design decision was deferred.
- Alternative: Add a cross-reference note in 08_Open-questions.md: "0 open items. 1 deferred item (OQ-0006, instructions upgrade path) tracked in 09_delta.md." This preserves the "0 open" status while providing discoverability.
- Assessment: **Minor documentation gap.** The deferred item IS tracked in 09_delta.md, so the information exists. The gap is navigability, not completeness.

### Challenge 2: TC-0017-0012 backward-compatibility test is underspecified

- Attack: TC-0017-0012 says "Run full test suite with the new instructions distribution code" and "All existing tests pass without modification." This is not a test case -- it is a CI gate. A proper backward-compatibility test would assert specific invariants: e.g., "the set of files created by `qfai init` on a new repo is a strict superset of the pre-v1.6.3 file set" or "the `expectedRegularFiles` list in existing tests does not need modification." The current TC-0017-0012 description says "No regressions in root/ template copy, .qfai/ template copy, symlink creation, or copilot-instructions.md handling" but does not define how these are verified beyond "run the suite."
- Alternative: Rewrite TC-0017-0012 as a concrete test: "Run `runInit` and assert that all files in the existing `expectedRegularFiles` constant are still created. Assert that instructions files are NOT in `expectedRegularFiles` (they are additive). Assert that all existing symlinks are unchanged."
- Assessment: **Defensible for v1.6.3** because the existing test suite (17 tests) provides this coverage implicitly. However, making TC-0017-0012 a real test rather than a meta-instruction would be stronger.

### Challenge 3: readFile from assets introduces a new failure mode not covered by error handling

- Attack: The Plan (10_Plan.md, Step 2) introduces `await readFile(templateSrc, "utf-8")` to read template content from the assets directory. If the asset file is missing (e.g., due to a packaging error where `npm pack` excludes `.github/` directories because of `.gitignore`-like patterns), this throws an unhandled ENOENT error. The existing `copilot-instructions.md` generation uses `buildCopilotInstructions()` (an inline function) which cannot fail due to missing assets. The new pattern introduces a deployment-time failure mode. Risk table (10_Plan.md Section 3) lists "Template asset not included in npm pack" with mitigation "TC-0017-0009 catches in CI," but TC-0017-0009 runs from the source tree, not from a packed tarball. The test validates source availability, not package availability.
- Alternative: Add a pre-pack integration test or a `postpack` script that verifies the tarball contains `.github/instructions/*.instructions.md`. Alternatively, add a try-catch in the distribution loop that logs a warning and continues (graceful degradation) rather than crashing `qfai init` if an asset is missing.
- Assessment: **Low probability, medium impact.** The `"files": ["assets"]` inclusion in package.json should work, but `.github/` directories can be tricky with npm's ignore patterns (`.github` is not ignored by default, but some publishing tools may filter it). The mitigation is adequate for v1.6.3 but a postpack check would eliminate the risk entirely.

### Challenge 4: AC-0017-0014 (empty file = existing) may conflict with future upgrade path

- Attack: BR-0017-0010 and AC-0017-0014 define that a 0-byte file is treated as existing and skipped. This means a user cannot "reset" an instructions file by truncating it and re-running init. If the deferred upgrade mechanism (OQ-0006, v1.7.0) uses "file absence" as the trigger for re-generation, users would need to delete the file entirely, not just empty it. This is a minor usability friction, but the 0-byte-as-existing rule eliminates a natural "soft reset" pattern that some tools support.
- Alternative: Define 0-byte files as "absent" (eligible for regeneration). This creates a simple upgrade path: truncate the file, re-run init, get fresh template. However, this violates the simplicity of the pure existence check (BR-0017-0001) and introduces content-inspection logic.
- Assessment: **Defensible.** The pure existence check is simpler, more predictable, and consistent with filesystem semantics (`fs.existsSync` returns true for 0-byte files). The "delete to reset" workflow is well-understood. This is a deliberate design choice, not an oversight.

### Challenge 5: Plan Step 3 activation guidance message is hardcoded English

- Attack: The activation guidance message in Plan Step 3 is entirely in English: "Copilot code review instructions were created. To activate: Settings > Copilot > Code Review > enable 'Use instruction files'." The rest of the spec uses Japanese for descriptions and English for technical terms (bilingual convention). The guidance URL points to English GitHub docs. For a tool whose spec documentation is bilingual (Japanese descriptions, English identifiers), shipping a monolingual guidance message without i18n consideration is inconsistent.
- Alternative: (a) Accept English-only for v1.6.3 since GitHub Copilot's documentation and UI are primarily English. (b) Note in the spec that i18n for CLI messages is out of scope for v1.6.3. Currently neither acknowledgment exists.
- Assessment: **Minor.** QFAI CLI output is already English-first (report format, log messages). This is consistent with existing behavior. No action needed, but worth noting for completeness.

## Verdict

PASS

## Conclusion

The SDD for spec-0017 is well-structured with complete traceability, clear design decisions, and comprehensive test coverage. The devil's advocate challenges identified:

1. **Navigability gap**: 08_Open-questions.md should cross-reference the deferred item in 09_delta.md (Challenge 1). Minor documentation improvement.
2. **TC-0017-0012 is meta, not concrete**: The backward-compatibility "test" is really a CI gate assertion. Defensible because existing suite provides coverage, but could be stronger as a concrete test (Challenge 2).
3. **Asset readFile failure mode**: The new `readFile`-from-assets pattern introduces a deployment-time failure not fully mitigated by source-tree-only tests (Challenge 3). Low risk due to package.json coverage.
4. **0-byte design choice**: Treating 0-byte as existing is a deliberate, defensible simplification (Challenge 4).
5. **English-only guidance**: Consistent with existing CLI output conventions (Challenge 5).

None of the challenges warrant FAIL. The core design is sound, the traceability is complete, and the implementation plan is concrete with specific line references and code patterns.
