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

| AC_ID        | Title                        | Notes      | Priority |
| ------------ | ---------------------------- | ---------- | -------- |
| AC-0006-0001 | DOM クローリング正常動作     | Happy path | P1       |
| AC-0006-0002 | URL 応答なしエラー           | Error case | P1       |
| AC-0006-0003 | UI コントラクト期待値抽出    | Happy path | P1       |
| AC-0006-0004 | data-qfai マーカー検出       | Happy path | P1       |
| AC-0006-0005 | マーカー未検出時の不一致報告 | Error case | P1       |
| AC-0006-0006 | フィデリティ証跡 JSON 出力   | Happy path | P1       |
| AC-0006-0007 | skeleton モード L1 evidence  | Edge case  | P1       |
| AC-0006-0008 | 冪等性の保証                 | NFR-0012   | P1       |
| AC-0006-0009 | Static-first default (no runtime) | v1.7.7 Remediation, REQ-0001 | P1 |
| AC-0006-0010 | Low-cost mode completes with static analysis only | v1.7.7 Remediation, REQ-0003 | P1 |
| AC-0006-0011 | Standard mode adds lightweight runtime evidence | v1.7.7 Remediation, REQ-0003 | P1 |
| AC-0006-0012 | Full-harness mode routes to dedicated skill | v1.7.7 Remediation, REQ-0003 | P1 |
| AC-0006-0013 | --mode flag appears in --help with all three values | v1.7.7 Remediation, REQ-0010 | P1 |
| AC-0006-0014 | Invalid --mode value produces actionable error | v1.7.7 Remediation, REQ-0010 | P1 |
| AC-0006-0015 | No-mode-flag defaults to low-cost | v1.7.7 Remediation, REQ-0001, REQ-0010 | P1 |

---

## [v1.7.7 Remediation] AC Gherkin

```gherkin
# AC-0006-0009
Scenario: Default prototyping runs static-first with no runtime dependency
  Given a QFAI project with valid spec files
  And no --mode flag is provided
  When the user runs `qfai prototype`
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
Scenario: Omitting --mode flag defaults to low-cost mode
  Given a QFAI project with valid spec files
  And no --mode flag is provided
  When the user runs `qfai prototype`
  Then the behavior is identical to `qfai prototype --mode low-cost`
  And the output indicates the active mode as low-cost
```
