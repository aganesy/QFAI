# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                        | AC-Refs                   | Rule                                                                                                                                                | Notes                                           | NFR-Refs |
| ------------ | ---------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- |
| BR-0006-0001 | DOM クローリング実行条件     | AC-0006-0001              | `--autogen-ui-fidelity` と `--base-url` が両方指定された場合、jsdom で指定 URL の DOM を取得しクローリングを実行する                                | jsdom を使用（ブラウザ不要）                    | -        |
| BR-0006-0002 | URL 接続タイムアウト         | AC-0006-0002              | `--base-url` への接続が 10 秒以内に応答しない場合、エラー Issue（code: QFAI-PROTO-001, message, suggested_action）を出力し終了コード 1 で終了する   | タイムアウト値は設定可能を検討                  | NFR-0040 |
| BR-0006-0003 | UI コントラクト YAML パース  | AC-0006-0003              | `.qfai/contracts/ui/*.yaml` を走査し、`screens[].elements[]` 構造から label, selector, data-qfai フィールドを抽出して期待値リストを生成する         | YAML パースエラー時は Issue で報告              | -        |
| BR-0006-0004 | data-qfai マーカー検出ルール | AC-0006-0004              | DOM 内の全要素から `data-qfai` 属性を収集し、値を UI コントラクトのエレメント ID と照合する                                                         | 属性値は完全一致で照合                          | -        |
| BR-0006-0005 | マーカー不一致報告           | AC-0006-0005              | UI コントラクトに定義されたエレメントのうち、DOM 内に対応する `data-qfai` マーカーが見つからないものを Issue（code: QFAI-PROTO-002）として報告する  | -                                               | NFR-0040 |
| BR-0006-0006 | 証跡 JSON 出力スキーマ       | AC-0006-0006              | prototyping.json は `{ uiFidelity: { level, screens[], timestamp, baseUrl } }` 構造で出力する。screens[] には各画面の elements マッチング結果を含む | 出力先は `.qfai/evidence/prototyping.json` 固定 | -        |
| BR-0006-0007 | skeleton モードルール        | AC-0006-0007              | `--base-url` が未指定の場合、skeleton モードとして `uiFidelity.screens=[]`, `level="L1"` で prototyping.json を出力する                             | プロトタイプ未実装段階での段階的検証を支援      | -        |
| BR-0006-0008 | 冪等性保証                   | AC-0006-0008              | 同一入力（UI コントラクト + DOM 状態）に対して、タイムスタンプを除く出力内容が同一であることを保証する                                              | timestamp フィールドのみ実行ごとに変動を許容    | NFR-0012 |
| BR-0006-0009 | CLI ヘルプ表示               | AC-0006-0001,AC-0006-0002 | `qfai prototyping --help` で --autogen-ui-fidelity, --base-url 等のオプション使用方法を表示する                                                     | -                                               | NFR-0042 |
