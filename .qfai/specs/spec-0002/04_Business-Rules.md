# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                               | AC-Refs                   | Rule                                                                                                                                            | Notes                   | NFR-Refs |
| ------------ | ----------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------- |
| BR-0002-0001 | バリデータ順次実行                  | AC-0002-0001              | validate は登録された全バリデータ（33+）を順次実行し、各バリデータの Issue[] を統合する                                                         | REQ-0010 準拠           |          |
| BR-0002-0002 | デフォルトフェーズ                  | AC-0002-0004              | --phase 未指定時はデフォルト full として全バリデータを実行する                                                                                  | REQ-0011 準拠           |          |
| BR-0002-0003 | フェーズによるスコープ制限          | AC-0002-0003              | --phase atdd/tdd/refinement 指定時は該当フェーズに属するバリデータのみ実行する                                                                  | REQ-0011 準拠           |          |
| BR-0002-0004 | 終了コード - error                  | AC-0002-0002,AC-0002-0005 | --fail-on error 時、error レベルの Issue が 1件以上あれば exit 1、なければ exit 0                                                               | REQ-0012 準拠           | NFR-0061 |
| BR-0002-0005 | 終了コード - warning                | AC-0002-0006              | --fail-on warning 時、warning 以上の Issue が 1件以上あれば exit 1                                                                              | REQ-0012 準拠           | NFR-0061 |
| BR-0002-0006 | 終了コード - never                  | AC-0002-0007              | --fail-on never 時、Issue の有無にかかわらず常に exit 0                                                                                         | REQ-0012 準拠           | NFR-0061 |
| BR-0002-0007 | GitHub アノテーション形式           | AC-0002-0008              | --format github 時、::error file={path},line={line}::{message} 形式で出力する                                                                   | REQ-0013 準拠           |          |
| BR-0002-0008 | GitHub アノテーション上限           | AC-0002-0009              | --format github 時、出力は最大100件に制限し、超過分は "N more issues truncated" メッセージを追加する                                            | REQ-0013 準拠           |          |
| BR-0002-0009 | validate.json スキーマ              | AC-0002-0010              | validate.json は { issues: Issue[], summary: Summary, metadata: Metadata } 構造で出力する                                                       | REQ-0014 準拠           |          |
| BR-0002-0010 | ランログディレクトリ命名            | AC-0002-0011              | ランログは .qfai/report/run-YYYYMMDDTHHMMSS/ 形式のディレクトリに保存する                                                                       | REQ-0015 準拠           |          |
| BR-0002-0011 | ウェイバー suppress                 | AC-0002-0012              | waivers.yml の suppress ルールに一致する Issue は suppressed=true フラグを付与し、デフォルト出力から除外する                                    | REQ-0110 準拠           | NFR-0011 |
| BR-0002-0012 | ウェイバー downgrade                | AC-0002-0013              | waivers.yml の downgrade ルールに一致する Issue は severity を1段階下げる（error→warning, warning→info）                                        | REQ-0110 準拠           | NFR-0011 |
| BR-0002-0013 | 必須ファイルセット定義              | AC-0002-0014,AC-0002-0015 | spec-XXXX/ には 01_Spec.md ~ 08_Open-questions.md が必須。\_policies/ には 01_Objective ~ 10_delta が必須                                       | REQ-0100 準拠           |          |
| BR-0002-0014 | ID 形式パターン                     | AC-0002-0016              | ID は PREFIX_XXXX 形式（4桁ゼロパディング）。PREFIX は CAP/US/AC/BR/EX/TC のいずれか                                                            | REQ-0101 準拠           |          |
| BR-0002-0015 | ID 重複禁止                         | AC-0002-0017              | 同一スペック内で同じ ID が複数定義されている場合は E_ID_DUPLICATE エラーとする                                                                  | REQ-0101 準拠           |          |
| BR-0002-0016 | トレーサビリティ必須エッジ          | AC-0002-0018,AC-0002-0019 | AC→TC, BR→EX, EX→TC の参照が全て存在すること。欠落は W_TRACE_MISSING_EDGE 警告                                                                  | REQ-0102 準拠           |          |
| BR-0002-0017 | ATDD アノテーション形式             | AC-0002-0020              | テストファイル内の QFAI:SPEC_XXXX:US_YYYY / TC_YYYY / CON_API_XXXX 形式を検証する                                                               | REQ-0103 準拠           |          |
| BR-0002-0018 | testsDir 不在時スキップ             | AC-0002-0021              | testsDir に指定されたディレクトリが存在しない場合、ATDD アノテーション検証をスキップする                                                        | REQ-0103 準拠           |          |
| BR-0002-0019 | ディスカッションパック 15ファイル   | AC-0002-0022              | ディスカッションパックには 15 の必須ファイルが存在すること                                                                                      | REQ-0104 準拠           |          |
| BR-0002-0020 | blocking OQ ゲート                  | AC-0002-0023              | 08_Open-questions.md に status=open の OQ がある場合は E_DPACK_BLOCKING_OQ エラーとする                                                         | REQ-0104 準拠           |          |
| BR-0002-0021 | コントラクト ID 形式                | AC-0002-0024              | コントラクト ID は CON-UI-XXXX / CON-API-XXXX / CON-DB-XXXX 形式であること                                                                      | REQ-0105 準拠           |          |
| BR-0002-0022 | コントラクト参照整合性              | AC-0002-0025              | スペック内のコントラクト参照先が実際に存在すること                                                                                              | REQ-0105 準拠           |          |
| BR-0002-0023 | Mermaid フェンスブロック形式        | AC-0002-0026              | mermaid フェンスブロックは `` `mermaid `` で開始し `` ` `` で閉じること                                                                         | REQ-0108 準拠           |          |
| BR-0002-0024 | Business-Flow Mermaid 必須          | AC-0002-0027              | \_policies/04_Business-Flow.md には最低1つの mermaid フェンスブロックが必須                                                                     | REQ-0112 準拠           |          |
| BR-0002-0025 | 冪等性保証                          | AC-0002-0028              | 同一入力に対して同一の validate.json 出力を保証する（タイムスタンプを除く）                                                                     |                         | NFR-0012 |
| BR-0002-0026 | 実行時間制約                        | AC-0002-0001              | 中規模プロジェクト（spec 5個）で 10秒以内に完了する                                                                                             |                         | NFR-0001 |
| BR-0002-0027 | 大規模プロジェクト対応              | AC-0002-0001              | spec 50個、テストファイル 1000個で 60秒以内に完了する                                                                                           |                         | NFR-0002 |
| BR-0002-0028 | ファイル探索上限                    | AC-0002-0001              | fast-glob によるファイル探索は上限 10,000件とし、超過時は truncated フラグを設定する                                                            |                         | NFR-0003 |
| BR-0002-0029 | canonical entrypoint 唯一の本番パス | AC-0002-0029              | validateProject() は runCanonicalUixValidators() を唯一の UIX バリデータ実行パスとして使用する。直接の runAllUixValidators() 呼び出しは行わない | REQ-0010, REQ-0011 準拠 |          |
| BR-0002-0030 | 旧アグリゲータ deprecation warning  | AC-0002-0030              | runAllUixValidators() は deprecation warning を発行し、内部で runCanonicalUixValidators() へ委譲する互換ラッパーとして動作する                  | DR-0101 準拠            |          |
