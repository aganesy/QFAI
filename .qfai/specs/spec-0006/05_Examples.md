# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID   | BR-Ref  | Input                                                                                                        | Expected                                                                                                                                  | Notes                          |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| EX-0006-0001 | BR-0006-0001 | UI コントラクト `login.yaml` 存在、`--base-url http://localhost:3000` でアプリ起動中                           | jsdom で DOM 取得成功、ラベル・マーカー収集結果が screens[] に格納される                                                                    | Interactive モード Happy path  |
| EX-0006-0002 | BR-0006-0002 | `--base-url http://localhost:9999` で応答なし                                                                  | `{ code: "QFAI-PROTO-001", message: "URL 応答タイムアウト: http://localhost:9999", suggested_action: "アプリケーションを起動してください" }` | タイムアウトエラー             |
| EX-0006-0003 | BR-0006-0003 | `.qfai/contracts/ui/login.yaml` に `screens: [{ path: "/login", elements: [{ label: "ログインボタン", selector: "#login-btn", data-qfai: "login-submit" }] }]` | 期待値リスト: `[{ label: "ログインボタン", selector: "#login-btn", dataQfai: "login-submit" }]`                                            | YAML パース正常                |
| EX-0006-0004 | BR-0006-0004 | DOM に `<button data-qfai="login-submit">ログイン</button>` が存在                                            | マーカー `login-submit` が検出され、UI コントラクトの `login-submit` と照合成功                                                             | マーカー検出成功               |
| EX-0006-0005 | BR-0006-0005 | UI コントラクトに `data-qfai: "signup-link"` 定義あるが DOM に該当マーカーなし                                   | Issue: `{ code: "QFAI-PROTO-002", message: "マーカー未検出: signup-link", suggested_action: "data-qfai=\"signup-link\" を要素に追加" }`     | 不一致報告                     |
| EX-0006-0006 | BR-0006-0006 | DOM クローリング完了、2 画面 5 エレメント全マッチ                                                               | `prototyping.json`: `{ uiFidelity: { level: "L3", screens: [{ path: "/login", elements: [...], matched: 3 }, ...], timestamp: "...", baseUrl: "http://localhost:3000" } }` | 証跡出力形式                   |
| EX-0006-0007 | BR-0006-0007 | `--base-url` 未指定で `qfai prototyping --autogen-ui-fidelity` 実行                                           | `prototyping.json`: `{ uiFidelity: { level: "L1", screens: [], timestamp: "..." } }`                                                      | Skeleton モード                |
| EX-0006-0008 | BR-0006-0008 | 同一条件で 2 回連続実行                                                                                       | 1 回目と 2 回目の prototyping.json が timestamp 以外同一                                                                                   | 冪等性確認                     |
| EX-0006-0009 | BR-0006-0009 | `qfai prototyping --help` 実行                                                                                | --autogen-ui-fidelity, --base-url 等のオプション使用方法が表示される                                                                       | CLI ヘルプ表示確認              |
