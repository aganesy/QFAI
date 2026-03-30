# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID       | BR-Ref      | Input | Expected | Notes |
| ----------- | ----------- | ----- | -------- | ----- |
| EX-0038-0001 | BR-0038-0001 | ブランチ上で対象specの04_Business-Rules.md変更 | Source Aが対象specを検出 | Happy path |
| EX-0038-0002 | BR-0038-0002 | ステージ済みの対象specの01_Spec.md変更 | Source Bが対象specを検出 | git diff --staged |
| EX-0038-0003 | BR-0038-0003 | evidence timestamp: 2026-03-28, spec mtime: 2026-03-30 | Source Cがstale specとして検出 | timestamp差 |
| EX-0038-0004 | BR-0038-0004 | 09_delta.mdに「対象BRの変更」記録あり | Source Dが対象specを検出 | delta.mdパース |
| EX-0038-0005 | BR-0038-0005 | Source A={対象A}, B={対象B}, C={対象A}, D={対象C} | changed\_specsに3件含まれる（union統合） | union統合 |
| EX-0038-0006 | BR-0038-0006 | 全ソースで変更spec=0件 | フルスキャンフォールバック、全specが対象 | 差分ゼロ |
| EX-0038-0007 | BR-0038-0007 | git not found エラー | Source A,B=N/A、Source C,Dのみで検出 | git不在 |
| EX-0038-0008 | BR-0038-0008 | prototyping起動、changed\_specsに2件検出 | 「変更spec一覧。prototyping実行しますか？」 | ユーザー確認 |
| EX-0038-0009 | BR-0038-0009 | implement起動、changed\_specsに1件検出 | 「対象specが検出されました。実装を開始しますか？」（自動選択） | 単一spec |
| EX-0038-0010 | BR-0038-0009 | implement起動、changed\_specsに3件検出 | 優先度順リスト表示、ユーザー選択 | 複数spec |
| EX-0038-0011 | BR-0038-0010 | 対象spec BR変更あり、紐づき実装ファイル未変更 | QFAI-TRACE-001 error報告 | トレーサビリティ断絶 |
| EX-0038-0012 | BR-0038-0010 | 対象spec BR変更あり、紐づき実装ファイル変更あり | チェックPASS | 整合 |
| EX-0038-0013 | BR-0038-0011 | 対象specに16\_Traceability-ledger.md不在 | warning「Ledger未定義」、チェックスキップ | Ledger不在 |
| EX-0038-0014 | BR-0038-0012 | --full フラグ指定 | 差分検出バイパス、全specスキャン | フルモード |
| EX-0038-0015 | BR-0038-0013 | prototyping完了後 | evidence Diff Context: {sha, timestamp, specs, mode} | evidence記録 |
| EX-0038-0016 | BR-0038-0014 | \_policies/04\_Business-Flow.md変更 | 全spec対象 + ユーザー確認プロンプト | Policy影響 |
| EX-0038-0017 | BR-0038-0015 | config: baseBranch="origin/develop" | git diff origin/develop..HEAD | カスタムベース |
