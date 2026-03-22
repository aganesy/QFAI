# test-list.md — spec-0017

| TDD-ID   | TC-Refs      | Layer       | Test file                            | Selector                                     | Status | DR-ID | Evidence                                                                      |
| -------- | ------------ | ----------- | ------------------------------------ | -------------------------------------------- | ------ | ----- | ----------------------------------------------------------------------------- |
| TDD-0001 | TC-0017-0009 | Unit        | packages/qfai/tests/cli/init.test.ts | SDD marker present in templates              | done   |       | RED: ENOENT template not found; GREEN: created asset files                    |
| TDD-0002 | TC-0017-0001 | Integration | packages/qfai/tests/cli/init.test.ts | New repo init creates both files             | done   |       | RED: ENOENT instructions not created; GREEN: added Step 3.5 distribution loop |
| TDD-0003 | TC-0017-0002 | Integration | packages/qfai/tests/cli/init.test.ts | Skip when files exist                        | done   |       | GREEN: custom content preserved after runInit                                 |
| TDD-0004 | TC-0017-0003 | Integration | packages/qfai/tests/cli/init.test.ts | --force does not override                    | done   |       | GREEN: custom content preserved with force:true                               |
| TDD-0005 | TC-0017-0004 | Integration | packages/qfai/tests/cli/init.test.ts | Directory auto-creation                      | done   |       | GREEN: .github/instructions/ created recursively                              |
| TDD-0006 | TC-0017-0005 | Integration | packages/qfai/tests/cli/init.test.ts | Partial existing files                       | done   |       | GREEN: code-review preserved, principles created                              |
| TDD-0007 | TC-0017-0006 | Integration | packages/qfai/tests/cli/init.test.ts | Report includes instructions                 | done   |       | GREEN: created count includes instructions, skipped paths listed              |
| TDD-0008 | TC-0017-0007 | Integration | packages/qfai/tests/cli/init.test.ts | --dry-run behavior                           | done   |       | GREEN: no files on disk after dryRun:true                                     |
| TDD-0009 | TC-0017-0008 | Integration | packages/qfai/tests/cli/init.test.ts | Idempotency (3 consecutive runs)             | done   |       | GREEN: content identical across 3 runs                                        |
| TDD-0010 | TC-0017-0010 | Integration | packages/qfai/tests/cli/init.test.ts | Activation guidance message                  | done   |       | GREEN: @github-copilot review appears on create, absent on re-run             |
| TDD-0011 | TC-0017-0011 | Integration | packages/qfai/tests/cli/init.test.ts | Empty file treated as existing               | done   |       | GREEN: 0-byte file not overwritten                                            |
| TDD-0012 | TC-0017-0012 | Integration | packages/qfai/tests/cli/init.test.ts | Backward compatibility (existing tests pass) | done   |       | GREEN: all expected files + symlinks present; 452/452 tests pass              |
