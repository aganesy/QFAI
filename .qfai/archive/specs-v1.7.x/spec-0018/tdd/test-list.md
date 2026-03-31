# test-list.md — spec-0018 TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                | Selector                               | Status | DR-ID | Evidence                                                                        |
| -------- | ------------ | ----------- | ---------------------------------------- | -------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------- |
| TDD-0001 | TC-0018-0006 | integration | packages/qfai/tests/codex/agents.test.ts | config.toml 存在・妥当性               | done   |       | RED: ENOENT config.toml (2 fail) → GREEN: config.toml 作成 (2 pass)             |
| TDD-0002 | TC-0018-0001 | integration | packages/qfai/tests/codex/agents.test.ts | 39 TOML ファイル存在確認               | done   |       | RED: 0 files (fail) → GREEN: 39 stubs 作成 (pass)                               |
| TDD-0003 | TC-0018-0002 | unit        | packages/qfai/tests/codex/agents.test.ts | TOML 必須フィールド検証                | done   |       | RED: ENOENT (fail) → GREEN: name/description/developer_instructions 追加 (pass) |
| TDD-0004 | TC-0018-0009 | unit        | packages/qfai/tests/codex/agents.test.ts | name フィールドとファイル名の一致      | done   |       | RED: ENOENT (fail) → GREEN: name=filename 設定 (pass)                           |
| TDD-0005 | TC-0018-0004 | unit        | packages/qfai/tests/codex/agents.test.ts | レビュー系 sandbox_mode = read-only    | done   |       | RED: ENOENT (fail) → GREEN: sandbox_mode 追加 (pass)                            |
| TDD-0006 | TC-0018-0005 | unit        | packages/qfai/tests/codex/agents.test.ts | 実装系 sandbox_mode 省略               | done   |       | RED: ENOENT (fail) → GREEN: sandbox_mode 省略確認 (pass)                        |
| TDD-0007 | TC-0018-0003 | integration | packages/qfai/tests/codex/agents.test.ts | developer_instructions コンテンツ一致  | done   |       | RED: ENOENT (fail) → GREEN: canonical MD 6 セクション変換 (pass)                |
| TDD-0008 | TC-0018-0007 | unit        | packages/qfai/tests/codex/agents.test.ts | model フィールド不在確認               | done   |       | RED: ENOENT (fail) → GREEN: model 不在確認 (pass)                               |
| TDD-0009 | TC-0018-0008 | unit        | packages/qfai/tests/codex/agents.test.ts | nickname_candidates フィールド不在確認 | done   |       | RED: ENOENT (fail) → GREEN: nickname_candidates 不在確認 (pass)                 |
| TDD-0010 | TC-0018-0010 | unit        | packages/qfai/tests/codex/agents.test.ts | TOML 構文妥当性                        | done   |       | RED: ENOENT (fail) → GREEN: 40 files parse OK (pass)                            |
| TDD-0011 | TC-0018-0011 | integration | packages/qfai/tests/codex/agents.test.ts | スコープ外エージェントの不在確認       | done   |       | RED: ENOENT (fail) → GREEN: 5 excluded absent (pass)                            |
| TDD-0012 | TC-0018-0012 | unit        | packages/qfai/tests/codex/agents.test.ts | ファイル名 kebab-case 検証             | done   |       | RED: ENOENT (fail) → GREEN: kebab-case 検証 (pass)                              |
