# R04_code-reviewer

## Verdict: PASS

## Checklist

- [x] Design intent is actionable for downstream coding (REQ-0001 through REQ-0011 map clearly to init.ts modifications)
- [x] Maintainability signals are positive (symlink eliminates wrapper regeneration burden)
- [x] Implementation scope in init.ts is well-defined (syncIntegrationWrappers + pruneStaleQfaiWrappers + new git config call)
- [x] REQ-0006 specifies the `writeFile()` to `fs.symlink()` migration with correct type parameters per platform
- [x] REQ-0010 (relative path normalization) addresses a critical portability concern for symlink targets
- [x] REQ-0011 (idempotent init) is explicit and maps to existing skip-if-exists pattern in init.ts
- [x] REQ-0008 (prune extension) scope is clear: extend pruneStaleQfaiWrappers to cover old non-symlink skill directories
- [x] REQ-0009 (Windows fallback) decision is recorded: error + halt, no junction fallback -- reduces implementation complexity
- [x] OQ-0004 resolution (no partial state) is architecturally sound and simplifies error handling code paths
- [x] buildWrapperEntries() replacement strategy is clear: skills get directory symlinks, agents get file symlinks, READMEs stay as regular files
- [x] Wrapper builder functions (buildClaudeCommandWrapper, buildGithubPromptWrapper, etc.) are identified for removal
- [x] copilot-instructions.md update (REQ-0007) is actionable: change `.github/prompts/` reference to `.github/skills/`

## Findings

### F-R04-01: Relative path computation needs explicit specification (Severity: Low)

REQ-0010 states symlink targets must be relative paths (e.g., `../../.qfai/assistant/skills/qfai-*`), but the exact algorithm for computing the relative path from each integration directory depth is not specified. The current init.ts uses flat `writeFile()` calls with `entry.relativePath` split by `/`. The implementer will need to compute `path.relative(path.dirname(symlinkLocation), canonicalTarget)` for each link. This is straightforward but should be explicitly called out in the SDD phase to avoid off-by-one depth errors.

**Recommendation:** In the SDD, specify the relative path computation formula and provide example paths for each integration directory depth (e.g., `.claude/skills/qfai-atdd` -> `../../.qfai/assistant/skills/qfai-atdd` = depth 2, `.github/agents/architect.agent.md` -> `../../.qfai/assistant/agents/architect.md` = depth 2).

### F-R04-02: Agent symlink name mapping needs clarification for pruning (Severity: Low)

REQ-0004 covers creation of agent symlinks with name mismatch (`.github/agents/<name>.agent.md` -> `.qfai/assistant/agents/<name>.md`). REQ-0008 extends pruning but focuses on skill directories. The pruning logic for stale agent symlinks (e.g., an agent removed from canonical) is not explicitly addressed. The current `pruneStaleQfaiWrappers()` only handles skills.

**Recommendation:** In the SDD, clarify whether agent prune logic is needed in REQ-0008 or whether it is deferred. If agents can be added/removed, stale agent symlink pruning should be included.

### F-R04-03: Removal of wrapper builder functions is implied but not explicitly stated (Severity: Info)

The discussion correctly identifies that `buildClaudeCommandWrapper()`, `buildGithubPromptWrapper()`, `buildCodexSkillWrapper()`, `buildAgentsSkillWrapper()`, `buildClaudeAgentWrapper()`, and `buildGithubAgentWrapper()` will become dead code. Their removal is implied by the architecture change but not explicitly listed as a cleanup task.

**Recommendation:** The SDD should explicitly list the removal of these 6+ builder functions and the `WrapperEntry` type as part of the implementation delta.

### F-R04-04: `.claude/skills/` and `.github/skills/` are new symlink targets not in current init.ts (Severity: Info)

The current `buildWrapperEntries()` generates entries for `.claude/commands/`, `.github/prompts/`, `.codex/skills/`, `.agents/skills/`, `.claude/agents/`, and `.github/agents/`. The new architecture adds `.claude/skills/` and `.github/skills/` as symlink destinations, which do not exist in the current wrapper generation logic. This is a net-new integration path.

**Recommendation:** Ensure the SDD captures that `.claude/skills/` and `.github/skills/` are additive (not just a replacement) and verifies that non-QFAI skills (pr-fix, pr-merge) in those directories are not affected per OQ-0003.

## Notes

- The init.ts file at 677 lines is well-structured and the proposed changes are localized to `syncIntegrationWrappers()`, `buildWrapperEntries()`, `pruneStaleQfaiWrappers()`, and a new `git config` call. The refactoring surface is manageable.
- The decision to halt on Windows symlink failure (OQ-0004 -> Option C) is the correct choice from an implementation perspective: it avoids maintaining a dual code path (symlink + junction/copy fallback) that would significantly increase test matrix complexity.
- All findings are Low/Info severity. No blockers identified for proceeding to SDD.
