# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs      | EX-Ref                     | Steps                                                                     | Expected                              | Notes                  |
| ------------ | ----- | ------------ | -------------------------- | ------------------------------------------------------------------------- | ------------------------------------- | ---------------------- |
| TC-0038-0001 | L2    | AC-0038-0001 | EX-0038-0001               | git diff origin/main..HEADで.qfai/specs/spec-0005配下のファイル変更を検出 | spec-0005がchanged_specsに含まれる    | Source A単体テスト     |
| TC-0038-0002 | L2    | AC-0038-0001 | EX-0038-0002               | git diff --stagedで.qfai/specs/spec-0003配下のファイル変更を検出          | spec-0003がchanged_specsに含まれる    | Source B単体テスト     |
| TC-0038-0003 | L2    | AC-0038-0003 | EX-0038-0003               | evidence timestamp < spec mtimeの場合にstale判定                          | specがstaleとして分類される           | Source C単体テスト     |
| TC-0038-0004 | L2    | AC-0038-0001 | EX-0038-0004               | 09_delta.mdにspec-0012の変更記録をパース                                  | spec-0012がchanged_specsに含まれる    | Source D単体テスト     |
| TC-0038-0005 | L2    | AC-0038-0001 | EX-0038-0005               | 4ソースの結果をunion統合                                                  | 重複なしのchanged_specsセットが返る   | 統合ロジックテスト     |
| TC-0038-0006 | L2    | AC-0038-0004 | EX-0038-0006               | 全ソースゼロ時のフォールバック                                            | 全specがスキャン対象として返る        | フォールバックテスト   |
| TC-0038-0007 | L2    | AC-0038-0003 | EX-0038-0007               | git不在環境（execSync失敗）での検出                                       | Source A,B=空、Source C,Dのみ結果返却 | git不在テスト          |
| TC-0038-0008 | L3    | AC-0038-0001 | EX-0038-0008               | prototypingスキル起動→差分検出→ユーザー確認                               | 変更specリスト提示、承認後実行開始    | 統合テスト             |
| TC-0038-0009 | L3    | AC-0038-0002 | EX-0038-0009, EX-0038-0010 | implementスキル起動→差分検出→選択UI                                       | 単一時は自動選択、複数時はリスト表示  | 統合テスト             |
| TC-0038-0010 | L2    | AC-0038-0005 | EX-0038-0011               | spec BR変更+実装未変更でvalidate実行                                      | QFAI-TRACE-001報告                    | トレーサビリティテスト |
| TC-0038-0011 | L2    | AC-0038-0005 | EX-0038-0012               | spec BR変更+実装変更ありでvalidate実行                                    | チェックPASS                          | トレーサビリティ正常系 |
| TC-0038-0012 | L2    | AC-0038-0006 | EX-0038-0013               | Ledger不在specでvalidate実行                                              | warning出力、チェックスキップ         | Ledger不在テスト       |
| TC-0038-0013 | L2    | AC-0038-0007 | EX-0038-0014               | --fullフラグ指定でprototyping実行                                         | 差分検出バイパス、全specスキャン      | --fullテスト           |
| TC-0038-0014 | L2    | AC-0038-0008 | EX-0038-0015               | 実行完了後のevidenceファイル検証                                          | Diff Contextセクション含む            | evidence記録テスト     |
| TC-0038-0015 | L2    | AC-0038-0009 | EX-0038-0016               | \_policies配下変更時の検出                                                | 全spec対象+ユーザー確認               | Policy影響テスト       |
| TC-0038-0016 | L2    | AC-0038-0010 | EX-0038-0017               | config baseBranch設定でdiff実行                                           | 設定されたブランチでdiff              | ベースブランチテスト   |
| TC-0038-0017 | L2    | AC-0038-0005 | EX-0038-0011               | 後方互換: 既存evidenceにDiff Contextなし                                  | エラーにならずvalidate正常動作        | 後方互換テスト         |

## Coverage Matrix

| AC-ID        | TC count | Notes                    |
| ------------ | -------- | ------------------------ |
| AC-0038-0001 | 5        | TC-0038-0001〜0005       |
| AC-0038-0002 | 1        | TC-0038-0009             |
| AC-0038-0003 | 2        | TC-0038-0003, 0007       |
| AC-0038-0004 | 1        | TC-0038-0006             |
| AC-0038-0005 | 3        | TC-0038-0010, 0011, 0017 |
| AC-0038-0006 | 1        | TC-0038-0012             |
| AC-0038-0007 | 1        | TC-0038-0013             |
| AC-0038-0008 | 1        | TC-0038-0014             |
| AC-0038-0009 | 1        | TC-0038-0015             |
| AC-0038-0010 | 1        | TC-0038-0016             |
