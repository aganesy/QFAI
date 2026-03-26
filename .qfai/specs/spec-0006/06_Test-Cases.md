# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs                                  | EX-Ref       | Steps                                                                                                                                      | Expected                                                       | Notes                                 |
| ------------ | ----- | ---------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------- |
| TC-0006-0001 | L2    | AC-0006-0001                             | EX-0006-0001 | 1. UI コントラクト YAML を配置 2. ローカルサーバーを起動 3. `qfai prototyping --autogen-ui-fidelity --base-url http://localhost:3000` 実行 | DOM クローリング成功、screens[] にマッチング結果が格納される   | Interactive Happy path                |
| TC-0006-0002 | L2    | AC-0006-0002                             | EX-0006-0002 | 1. サーバーを停止した状態で 2. `qfai prototyping --autogen-ui-fidelity --base-url http://localhost:9999` 実行                              | QFAI-PROTO-001 エラー Issue 出力、終了コード 1                 | URL タイムアウト                      |
| TC-0006-0003 | L2    | AC-0006-0003                             | EX-0006-0003 | 1. `.qfai/contracts/ui/login.yaml` に screens[].elements[] を定義 2. 期待値抽出を実行                                                      | label, selector, data-qfai が正しく抽出される                  | YAML パース検証                       |
| TC-0006-0004 | L2    | AC-0006-0004                             | EX-0006-0004 | 1. DOM に data-qfai 属性付き要素を配置 2. DOM クローリングを実行                                                                           | data-qfai マーカーが検出され、UI コントラクトと照合成功        | マーカー検出検証                      |
| TC-0006-0005 | L2    | AC-0006-0005                             | EX-0006-0005 | 1. UI コントラクトにエレメント定義 2. DOM に対応マーカーなし 3. クローリング実行                                                           | QFAI-PROTO-002 Issue が報告される                              | 不一致検出検証                        |
| TC-0006-0006 | L2    | AC-0006-0006                             | EX-0006-0006 | 1. DOM クローリング正常完了後 2. prototyping.json の内容を確認                                                                             | uiFidelity オブジェクトが正しいスキーマで出力されている        | 証跡出力スキーマ検証                  |
| TC-0006-0007 | L2    | AC-0006-0007                             | EX-0006-0007 | 1. `--base-url` なしで `qfai prototyping --autogen-ui-fidelity` 実行                                                                       | `uiFidelity.screens=[]`, `level="L1"` で prototyping.json 出力 | Skeleton モード検証                   |
| TC-0006-0008 | L2    | AC-0006-0008                             | EX-0006-0008 | 1. 同一条件で `qfai prototyping --autogen-ui-fidelity --base-url http://localhost:3000` を 2 回実行 2. 出力を diff 比較                    | timestamp 以外の prototyping.json 内容が同一                   | 冪等性検証                            |
| TC-0006-0009 | L2    | AC-0006-0001, AC-0006-0004, AC-0006-0008 |              | 全 AC を網羅する統合テスト: prototyping 実行 → 証跡確認                                                                                    | 全 AC シナリオが正常に動作する                                 | 統合カバレッジ                        |
| TC-0006-0010 | L2    |                                          | EX-0006-0009 | Traceability backfill for EX-0006-0009                                                                                                     | EX-0006-0009 is referenced by at least one TC                  | Auto-added for validator traceability |
