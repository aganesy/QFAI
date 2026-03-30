# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0006-0001
Scenario: DOM クローリングによるフィデリティ自動生成
  Given UI コントラクト YAML が `.qfai/contracts/ui/` に存在する
  And `--base-url` で指定したアプリケーションが起動している
  When `qfai prototyping --autogen-ui-fidelity --base-url http://localhost:3000` を実行する
  Then jsdom で DOM クローリングが実行され、フィデリティ証跡が生成される

# AC-0006-0002
Scenario: URL 応答なしエラー
  Given `--base-url` で指定した URL が応答しない
  When `qfai prototyping --autogen-ui-fidelity --base-url http://localhost:9999` を実行する
  Then エラーメッセージ（code, message, suggested_action）が表示され、終了コード 1 が返される

# AC-0006-0003
Scenario: UI コントラクト YAML からの期待値抽出
  Given `.qfai/contracts/ui/login.yaml` に screens[].elements[] が定義されている
  When UI コントラクト期待値抽出が実行される
  Then label, selector, data-qfai の期待値リストが生成される

# AC-0006-0004
Scenario: data-qfai マーカー検出
  Given DOM 内に `data-qfai="login-submit-btn"` 属性を持つ要素が存在する
  When DOM クローリングが実行される
  Then `data-qfai` マーカーが検出され、UI コントラクトのエレメントと対応付けされる

# AC-0006-0005
Scenario: マーカー未検出時の不一致報告
  Given UI コントラクトに定義されたエレメントに対応する `data-qfai` マーカーが DOM に存在しない
  When DOM クローリングが実行される
  Then 不一致が Issue として報告される

# AC-0006-0006
Scenario: フィデリティ証跡の JSON 出力
  Given DOM クローリングが正常完了している
  When 証跡出力が実行される
  Then `.qfai/evidence/prototyping.json` に uiFidelity オブジェクトが出力される

# AC-0006-0007
Scenario: skeleton モードでの L1 evidence 記録
  Given UI コントラクトは存在するがプロトタイプが未実装である
  When `qfai prototyping --autogen-ui-fidelity` を `--base-url` なしで実行する
  Then `uiFidelity.screens=[]`, `level="L1"` で prototyping.json が出力される

# AC-0006-0008
Scenario: 冪等性の保証
  Given 同一の UI コントラクトと DOM 状態がある
  When `qfai prototyping --autogen-ui-fidelity --base-url http://localhost:3000` を 2 回連続実行する
  Then 2 回の出力の prototyping.json の内容が同一である（タイムスタンプを除く）
```

## AC Catalog (optional)

| AC_ID        | Title                                                                                       | Notes                           | Priority |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------- | -------- |
| AC-0006-0001 | DOM クローリング正常動作                                                                    | Happy path                      | P1       |
| AC-0006-0002 | URL 応答なしエラー                                                                          | Error case                      | P1       |
| AC-0006-0003 | UI コントラクト期待値抽出                                                                   | Happy path                      | P1       |
| AC-0006-0004 | data-qfai マーカー検出                                                                      | Happy path                      | P1       |
| AC-0006-0005 | マーカー未検出時の不一致報告                                                                | Error case                      | P1       |
| AC-0006-0006 | フィデリティ証跡 JSON 出力                                                                  | Happy path                      | P1       |
| AC-0006-0007 | skeleton モード L1 evidence                                                                 | Edge case                       | P1       |
| AC-0006-0008 | 冪等性の保証                                                                                | NFR-0012                        | P1       |
| AC-0006-0009 | Low-cost mode static-first (no runtime)                                                     | v1.7.7 Remediation, REQ-0001    | P1       |
| AC-0006-0010 | Low-cost mode completes with static analysis only                                           | v1.7.7 Remediation, REQ-0003    | P1       |
| AC-0006-0011 | Standard mode adds lightweight runtime evidence                                             | v1.7.7 Remediation, REQ-0003    | P1       |
| AC-0006-0012 | Full-harness mode routes to dedicated skill                                                 | v1.7.7 Remediation, REQ-0003    | P1       |
| AC-0006-0013 | --mode flag appears in --help with all three values                                         | v1.7.7 Remediation, REQ-0010    | P1       |
| AC-0006-0014 | Invalid --mode value produces actionable error                                              | v1.7.7 Remediation, REQ-0010    | P1       |
| AC-0006-0015 | No-mode-flag resolves via precedence chain to effective mode                                | DR-0084, REQ-0001, REQ-0010     | P1       |
| AC-0006-0016 | Discussion artifact contains prototyping.recommended_mode and prototyping.rationale         | US-0006-0010, REQ-0003          | P1       |
| AC-0006-0017 | Precedence resolution: CLI > discussion > system default                                    | US-0006-0011, DR-0084, REQ-0010 | P1       |
| AC-0006-0018 | Missing discussion recommendation falls back to system default (standard)                   | US-0006-0011, DR-0084           | P1       |
| AC-0006-0019 | Effective mode logged with source, recommended, effective, rationale, evidence expectations | US-0006-0012, REQ-0010          | P1       |
| AC-0006-0020 | Non-visual surface marks visual-review evidence as n/a                                      | US-0006-0013, REQ-0003          | P1       |
| AC-0006-0021 | Non-visual surface does not fail on absent browser/visual checks                            | US-0006-0013, REQ-0003          | P1       |

---

## [v1.7.7 Remediation] AC Gherkin

```gherkin
# AC-0006-0009
Scenario: Low-cost mode runs static-first with no runtime dependency
  Given a QFAI project with valid spec files
  When the user runs `qfai prototype --mode low-cost`
  Then static analysis completes without launching any process, fetching any URL, or requiring a browser
  And prototyping output is produced based on spec and contract analysis only

# AC-0006-0010
Scenario: Low-cost mode completes with static analysis only
  Given a QFAI project with valid spec files
  When the user runs `qfai prototype --mode low-cost`
  Then only static analysis is executed (spec parsing, contract extraction, schema validation)
  And no runtime dependency (process, HTTP, browser) is required
  And evidence is written at level L1 or L2 depending on available contracts

# AC-0006-0011
Scenario: Standard mode adds lightweight runtime evidence to static analysis
  Given a QFAI project with valid spec files and a running local server
  When the user runs `qfai prototype --mode standard`
  Then static analysis executes first
  And lightweight runtime checks (e.g., skeleton-mode DOM evidence) execute after static analysis
  And evidence is written at level L2 or L3

# AC-0006-0012
Scenario: Full-harness mode from this skill routes user to dedicated skill
  Given a QFAI project with valid spec files
  When the user runs `qfai prototype --mode full-harness`
  Then the CLI emits a guidance message directing the user to `/qfai-prototyping-full-harness`
  And exits with code 0 (guidance, not error)
  And no partial prototyping loop is started in this skill

# AC-0006-0013
Scenario: --mode flag appears in --help with all three values and descriptions
  When the user runs `qfai prototype --help`
  Then the output includes `--mode` with at least three values: low-cost, standard, full-harness
  And each value has a description explaining its evidence level and runtime requirements
  And full-harness description notes the dedicated skill

# AC-0006-0014
Scenario: Invalid --mode value produces actionable error
  Given the user runs `qfai prototype --mode unknown-mode`
  Then the CLI outputs an error with code QFAI-PROTO-010
  And the error message lists valid mode values: low-cost, standard, full-harness
  And suggested_action explains how to choose a valid mode
  And the process exits with code 1

# AC-0006-0015
Scenario: Omitting --mode flag resolves via precedence chain to effective mode
  Given a QFAI project with valid spec files
  And no --mode flag is provided
  When the user runs `qfai prototype`
  Then mode resolution checks discussion artifact for recommended_mode first
  And if discussion artifact has a valid recommended_mode, that mode is used
  And if no discussion artifact recommendation exists, system default `standard` is used
  And the output includes the effective mode and the resolution source
```

---

## [Prototyping Mode Switch UX] AC Gherkin

```gherkin
# AC-0006-0016
Scenario: Discussion artifact contains prototyping.recommended_mode and prototyping.rationale
  Given a discussion pack has been generated for the project
  When the discussion output or sidecar YAML is inspected
  Then a `prototyping.recommended_mode` field exists with a valid mode value (low-cost, standard, or full-harness)
  And a `prototyping.rationale` field exists explaining why this mode was recommended

# AC-0006-0017
Scenario: Precedence resolution — CLI overrides discussion recommendation overrides system default
  Given a discussion artifact recommends `low-cost`
  And the user runs `qfai prototype --mode standard`
  Then the effective mode is `standard` (CLI override wins)
  And the mode log shows mode_source as `cli-override`
  And the mode log shows recommended_mode as `low-cost` (from discussion)

# AC-0006-0018
Scenario: Missing discussion recommendation falls back to system default (standard)
  Given no discussion artifact exists or the discussion artifact has no prototyping.recommended_mode field
  And no --mode flag is provided
  When the user runs `qfai prototype`
  Then the effective mode is `standard` (system default per DR-0084)
  And the mode log shows mode_source as `default`
  And a note (not error) is emitted indicating no discussion recommendation was found

# AC-0006-0019
Scenario: Effective mode logged with source, recommended, effective, rationale, evidence expectations
  Given the user runs `qfai prototype` (with or without --mode flag)
  When prototyping execution begins
  Then the output includes mode_source (one of: cli-override, discussion-recommendation, default)
  And the output includes recommended_mode (from discussion artifact, or null)
  And the output includes effective_mode (the mode actually used)
  And the output includes rationale (from discussion artifact, or "system default" / "CLI override")
  And the output includes evidence_expectations (evidence levels the effective mode produces)

# AC-0006-0020
Scenario: Non-visual surface marks visual-review evidence as n/a
  Given the prototyping target is a non-visual surface (CLI, API, or library)
  When prototyping runs in any mode (low-cost, standard, full-harness)
  Then visual-review evidence fields are set to `n/a`
  And all other evidence fields are populated normally
  And the prototyping run completes successfully

# AC-0006-0021
Scenario: Non-visual surface does not fail on absent browser/visual checks
  Given the prototyping target is a non-visual surface (CLI, API, or library)
  When prototyping runs in standard mode (which normally includes visual checks)
  Then the run does not fail due to missing browser or visual review capability
  And visual-review evidence is marked `n/a` instead of producing an error
  And static and non-visual runtime evidence is collected normally
```
