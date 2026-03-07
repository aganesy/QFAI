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

| AC_ID   | Title                          | Notes                        | Priority |
| ------- | ------------------------------ | ---------------------------- | -------- |
| AC-0006-0001 | DOM クローリング正常動作        | Happy path                   | P1       |
| AC-0006-0002 | URL 応答なしエラー              | Error case                   | P1       |
| AC-0006-0003 | UI コントラクト期待値抽出       | Happy path                   | P1       |
| AC-0006-0004 | data-qfai マーカー検出          | Happy path                   | P1       |
| AC-0006-0005 | マーカー未検出時の不一致報告    | Error case                   | P1       |
| AC-0006-0006 | フィデリティ証跡 JSON 出力      | Happy path                   | P1       |
| AC-0006-0007 | skeleton モード L1 evidence     | Edge case                    | P1       |
| AC-0006-0008 | 冪等性の保証                    | NFR-0012                     | P1       |
