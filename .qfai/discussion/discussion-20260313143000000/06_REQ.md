# 06_REQ

## Requirements Table

| REQ-ID   | Title                                    | Description                                                                                                                                                             | Source             | Priority | Status |
| -------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- | ------ |
| REQ-0001 | Preflight Diff Protocol 共通定義         | 下流スキル（atdd, prototyping）の SKILL.md に `Phase 0 - Preflight Diff` セクションを追加し、3つのソース（git diff, timestamp, delta.md）による複合差分検出を定義する   | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0002 | Source A: git diff 検出                  | evidence の `last_commit_sha` から HEAD までの `.qfai/specs/` 配下の変更ファイルを `git diff` で検出する                                                                | SRC-0001, SRC-0006 | must     | draft  |
| REQ-0003 | Source B: timestamp 比較                 | evidence ファイルの `last_run_timestamp` と spec ファイルの更新日時を比較し、evidence 以降に更新された spec を検出する                                                  | SRC-0001           | must     | draft  |
| REQ-0004 | Source C: delta.md パース                | `09_delta.md` の最新 `DELTA-XXXX` エントリの Primary/Tags/Scope を読み取り、変更の意図と種別を取得する                                                                  | SRC-0001, SRC-0006 | must     | draft  |
| REQ-0005 | 統合判定ロジック                         | `changed_specs = union(Source A, Source B)`（漏れ防止の OR 結合）、`change_context = Source C`（変更意図の補強情報）として統合する                                      | SRC-0001           | must     | draft  |
| REQ-0006 | Implementation State Analysis            | 変更 spec の obligations（US/TC/CON-API）と、既存実装の QFAI アノテーションを突合し、implemented / missing / stale / unchanged に分類する                               | SRC-0001, SRC-0007 | must     | draft  |
| REQ-0007 | /qfai-atdd インクリメンタルモード        | `/qfai-atdd` SKILL.md に Incremental Mode セクションを追加。missing obligations の新規テスト生成と stale obligations のテスト更新を行い、unchanged はスキップする       | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0008 | /qfai-prototyping インクリメンタルモード | `/qfai-prototyping` SKILL.md に Incremental Mode セクションを追加。changed_specs のスケルトン更新と unchanged specs の Runtime Gate 検証のみを行う                      | SRC-0001, SRC-0003 | must     | draft  |
| REQ-0009 | Evidence Diff Context セクション         | 各スキルの evidence ファイルに `Diff Context` セクション（last_commit_sha, last_run_timestamp, changed_specs, execution_mode, stale/new/skipped obligations）を追加する | SRC-0001, SRC-0010 | must     | draft  |
| REQ-0010 | フルモードフォールバック                 | evidence が存在しない初回実行時は全 spec を対象とするフルモードで動作する                                                                                               | SRC-0001           | must     | draft  |
| REQ-0011 | --full フラグ                            | ユーザーが明示的にフルスキャンを指定できる `--full` フラグ（またはスキル引数）を定義する。差分検出をバイパスして全 spec を処理する                                      | SRC-0001           | should   | draft  |
| REQ-0012 | Policy 変更時の影響波及                  | `_policies/` 配下のファイル変更が検出された場合、保守的に全 spec を affected_specs に追加し、ユーザー確認の上でスコープを決定する                                       | SRC-0001, SRC-0009 | must     | draft  |
| REQ-0013 | /qfai-verify フルスキャン維持            | `/qfai-verify` は Preflight Diff Protocol を適用せず、常に全 spec をフルスキャンする                                                                                    | SRC-0001, SRC-0005 | must     | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
