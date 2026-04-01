# 10 Plan

- Spec: spec-0003
- Parent: CAP-0003
- Role: solution-architect + test-design-analyst

## 1. Implementation Strategy

### Primary Source File

| File                                     | Responsibility                                                 |
| ---------------------------------------- | -------------------------------------------------------------- |
| `packages/qfai/src/cli/commands/init.ts` | CLI entry point. runInit() orchestrates all init operations    |
| `packages/qfai/src/cli/lib/fs.ts`        | copyTemplatePaths / copyTemplateTree for template distribution |
| `packages/qfai/src/cli/lib/assets.ts`    | getInitAssetsDir() for resolving asset root                    |

### Key Functions (implemented)

| Function                    | Responsibility                                                               |
| --------------------------- | ---------------------------------------------------------------------------- |
| `runInit()`                 | Orchestrator: template copy, git config, symlink sync, prune, report         |
| `syncIntegrationWrappers()` | README generation, copilot-instructions, instructions distribution, symlinks |
| `createSkillSymlinks()`     | Directory symlinks for 4 integration dirs                                    |
| `createAgentSymlinks()`     | File symlinks for .claude/agents/ and .github/agents/                        |
| `ensureSymlink()`           | Idempotent symlink creation with force/broken link handling                  |
| `pruneStaleQfaiWrappers()`  | Remove deprecated commands/prompts/non-symlink skill dirs                    |
| `pruneLegacySkillFiles()`   | Remove 10_workflow.md from skill directories                                 |
| `configureGitSymlinks()`    | Set git config core.symlinks true                                            |

## 2. Test Strategy

### Integration Tests (`tests/cli/init.test.ts`)

| Annotation                  | Verification                                        |
| --------------------------- | --------------------------------------------------- |
| QFAI:SPEC-0003:US-0003-0001 | Empty directory init creates all expected files     |
| QFAI:SPEC-0003:US-0003-0002 | Idempotent init skips existing files                |
| QFAI:SPEC-0003:US-0003-0003 | --force overwrites skills but protects skills.local |
| QFAI:SPEC-0003:US-0003-0005 | Skill symlinks are valid directory symlinks         |
| QFAI:SPEC-0003:US-0003-0011 | Instructions files created in new repo              |

## 3. Dependencies

| Dependency           | Content                                              |
| -------------------- | ---------------------------------------------------- |
| spec-0004 (validate) | validate checks init-created directory structure     |
| spec-0006 (doctor)   | doctor diagnoses init-created config and directories |

## 4. Implementation Order

All functionality is already implemented. This spec documents existing behavior.
