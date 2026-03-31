# test-list.md -- spec-0003

Consolidated from old spec-0001 tests, spec-0017 TDD ledger, and spec-0018 TDD ledger.

| TDD-ID   | TC-Refs      | Layer       | Test file                                | Selector                                         | Status | Evidence                                                              |
| -------- | ------------ | ----------- | ---------------------------------------- | ------------------------------------------------ | ------ | --------------------------------------------------------------------- |
| TDD-0001 | TC-0003-0001 | integration | packages/qfai/tests/cli/init.test.ts     | Empty directory init                             | done   | All expected directories and config file created                      |
| TDD-0002 | TC-0003-0002 | integration | packages/qfai/tests/cli/init.test.ts     | Idempotent init skips existing                   | done   | Existing files preserved, new files added                             |
| TDD-0003 | TC-0003-0003 | integration | packages/qfai/tests/cli/init.test.ts     | --force overwrites skills, protects skills.local | done   | Skills overwritten, skills.local untouched                            |
| TDD-0004 | TC-0003-0004 | integration | packages/qfai/tests/cli/init.test.ts     | --dry-run no files created                       | done   | No files on disk after dryRun:true                                    |
| TDD-0005 | TC-0003-0005 | integration | packages/qfai/tests/cli/init.test.ts     | Skill directory symlinks created                 | done   | 4 integration dirs have valid symlinks                                |
| TDD-0006 | TC-0003-0006 | integration | packages/qfai/tests/cli/init.test.ts     | Agent file symlinks created                      | done   | .claude/agents/ and .github/agents/ symlinks valid                    |
| TDD-0007 | TC-0003-0007 | integration | packages/qfai/tests/cli/init.test.ts     | Legacy 10_workflow.md removed                    | done   | Legacy files deleted on --force                                       |
| TDD-0008 | TC-0003-0008 | integration | packages/qfai/tests/cli/init.test.ts     | Old commands/prompts pruned                      | done   | qfai-*.md and qfai-*.prompt.md removed                                |
| TDD-0009 | TC-0003-0011 | integration | packages/qfai/tests/cli/init.test.ts     | Instructions files created in new repo           | done   | Both files created with YAML frontmatter                              |
| TDD-0010 | TC-0003-0012 | integration | packages/qfai/tests/cli/init.test.ts     | Existing instructions skipped                    | done   | Custom content preserved after runInit                                |
| TDD-0011 | TC-0003-0013 | integration | packages/qfai/tests/cli/init.test.ts     | --force does not override instructions           | done   | Custom content preserved with force:true                              |
| TDD-0012 | TC-0003-0014 | integration | packages/qfai/tests/cli/init.test.ts     | Activation guidance printed on create            | done   | Guidance appears on create, absent on re-run                          |
| TDD-0013 | TC-0003-0015 | integration | packages/qfai/tests/cli/init.test.ts     | Idempotency across 3 consecutive runs            | done   | Content identical across 3 runs                                       |
