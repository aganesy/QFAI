# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                              | AC-Refs                            | Rule                                                                                                                                           | Notes              | NFR-Refs |
| ------------ | ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- |
| BR-0011-0001 | Preflight Diff 自動起動            | AC-0011-0001                       | /qfai-prototyping または /qfai-atdd の実行開始時に Preflight Diff Protocol を自動的に起動する                                                 | REQ-0001 準拠      |          |
| BR-0011-0002 | Source A: git diff 検出            | AC-0011-0002                       | git diff --name-only {last_commit_sha}..HEAD で .qfai/specs/ 配下の変更ファイルを検出し、変更された spec ディレクトリを Source A とする         | REQ-0002 準拠      |          |
| BR-0011-0003 | Source B: timestamp 比較           | AC-0011-0002                       | evidence の last_run_timestamp と各 spec ファイルの mtime を比較し、mtime が新しい spec を Source B とする                                      | REQ-0003 準拠      |          |
| BR-0011-0004 | Source C: delta.md パース          | AC-0011-0002                       | 各 spec の 09_delta.md をパースし、変更サマリからコンテキスト情報（change_context）を取得する                                                  | REQ-0004 準拠      |          |
| BR-0011-0005 | 統合判定 union ロジック            | AC-0011-0002,AC-0011-0021          | changed_specs = union(Source A, Source B) として統合する。change_context = Source C は補足情報として付与する                                    | REQ-0005 準拠      | NFR-0001 |
| BR-0011-0006 | Diff Summary 表示                  | AC-0011-0003                       | changed_specs 一覧、各 spec の変更ソース（A/B/両方）、change_context を人間可読な形式で Diff Summary として出力する                             | NFR-0005 準拠      | NFR-0005 |
| BR-0011-0007 | フルモードフォールバック           | AC-0011-0004,AC-0011-0022          | evidence ファイルが存在しない、または Diff Context セクションがない場合、全 spec をフルスキャン対象とし execution_mode=full で実行する           | REQ-0010 準拠      | NFR-0003 |
| BR-0011-0008 | アノテーションスキャン             | AC-0011-0005                       | テストファイルおよびスケルトンコード内の QFAI アノテーション（QFAI:SPEC-XXXX:US/TC/CON）をスキャンし、spec ごとの実装状態を収集する             | REQ-0006 準拠      |          |
| BR-0011-0009 | ISA 4状態分類                      | AC-0011-0006                       | spec を以下の4状態に分類する: implemented（テスト・コード存在）、missing（未実装）、stale（実装古い）、unchanged（変更なし・実装最新）         | REQ-0006 準拠      |          |
| BR-0011-0010 | stale 判定条件                     | AC-0011-0007                       | stale は Primary=Behavior または Primary=Initial の spec のみ対象。changed_specs に含まれ、かつ対応テスト/コードが spec 変更後に更新されていない場合に stale とする | DR-0010 準拠       |          |
| BR-0011-0011 | prototyping changed のみ更新       | AC-0011-0008                       | /qfai-prototyping インクリメンタルモードでは changed_specs に含まれる spec のスケルトンのみ更新する                                            | REQ-0008 準拠      |          |
| BR-0011-0012 | prototyping unchanged Gate のみ    | AC-0011-0009                       | /qfai-prototyping インクリメンタルモードでは unchanged の spec に対して Runtime Gate チェック（コンパイル・起動確認）のみ実行する               | REQ-0008 準拠      |          |
| BR-0011-0013 | prototyping Tags 絞り込み          | AC-0011-0010                       | /qfai-prototyping インクリメンタルモードでは changed_specs に関連する Tags のみをスケルトン生成対象とする                                      | REQ-0008 準拠      |          |
| BR-0011-0014 | evidence last_commit_sha 記録      | AC-0011-0011                       | スキル実行完了後、evidence の Diff Context セクションに現在の git HEAD SHA を last_commit_sha として記録する                                    | REQ-0009 準拠      |          |
| BR-0011-0015 | evidence last_run_timestamp 記録   | AC-0011-0012                       | スキル実行完了後、evidence の Diff Context セクションに ISO 8601 形式のタイムスタンプを last_run_timestamp として記録する                       | REQ-0009 準拠      |          |
| BR-0011-0016 | evidence changed_specs 記録        | AC-0011-0013                       | スキル実行完了後、evidence の Diff Context セクションに処理した spec リストと execution_mode（incremental/full）を記録する                      | REQ-0009 準拠      |          |
| BR-0011-0017 | --full フラグ強制フルスキャン      | AC-0011-0014                       | --full フラグ指定時は Preflight Diff を実行せず、全 spec をフルスキャン対象とし execution_mode=full で実行する                                  | REQ-0011 準拠      |          |
| BR-0011-0018 | Policy 変更時保守的全 spec         | AC-0011-0015                       | Source A で _policies/ 配下のファイル変更を検出した場合、changed_specs に全 spec を含め、ユーザーに確認メッセージを提示する                     | REQ-0012, DR-0011  |          |
| BR-0011-0019 | verify フルスキャン維持            | AC-0011-0016                       | /qfai-verify は Preflight Diff Protocol を使用せず、常にフルスキャンで全 spec を検証する                                                       | REQ-0013, DR-0007  |          |
| BR-0011-0020 | atdd missing テスト新規生成        | AC-0011-0017                       | /qfai-atdd インクリメンタルモードでは missing に分類された spec のテストを新規生成する                                                         | REQ-0007 準拠      |          |
| BR-0011-0021 | atdd stale テスト更新              | AC-0011-0018                       | /qfai-atdd インクリメンタルモードでは stale に分類された spec の既存テストを更新する                                                           | REQ-0007 準拠      |          |
| BR-0011-0022 | atdd unchanged スキップ            | AC-0011-0019                       | /qfai-atdd インクリメンタルモードでは unchanged に分類された spec のテストは処理せずスキップする                                               | REQ-0007 準拠      |          |
| BR-0011-0023 | git 不可時 Source A スキップ       | AC-0011-0020                       | git リポジトリ不在または git コマンド利用不可の場合、Source A をスキップし Source B のみで changed_specs を算出する。エラーではなく警告とする    | REQ-0002 準拠      | NFR-0003 |
| BR-0011-0024 | 既存 evidence 後方互換             | AC-0011-0022                       | evidence ファイルに Diff Context セクションが存在しない場合でもエラーとせず、フルスキャンモードにフォールバックする                             | NFR-0004 準拠      | NFR-0004 |
| BR-0011-0025 | 差分検出漏れゼロ                   | AC-0011-0002,AC-0011-0005          | 3ソース union により、いずれか1ソースでも変更を検出した spec は changed_specs に含める。漏れ方向のエラーは許容しない                            |                    | NFR-0001 |
